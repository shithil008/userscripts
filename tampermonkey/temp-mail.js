// temp-mail.js — reusable library, load via @require
// Consumer script must declare: @grant GM_xmlhttpRequest, GM_setValue, GM_getValue

(function() {
    'use strict';

    let authToken = null;
    let accountId = null;
    let otpFound = false;
    let checkIntervalId = null;
    let currentAllowedSenders = [];
    let _resolveOtp = null;

    const otpPatterns = [
        /\b(\d{4,8})\b/,
        /(?:code|otp|pin|token)\W*(\d{4,8})/i,
        /(\d{3,4})[^\w\s\r\n]*[a-zA-Z]{1,3}[^\w\s\r\n]*(\d{3,4})/i,
        /[a-zA-Z0-9]{4,10}/,
        /(?<!\d)(\d{3,4}[-\s]?\d{3,4})(?!\d)/,
        /verification.*?(\d{4,8})/i,
        /confirm.*?(\d{4,8})/i,
        /authentication.*?(\d{4,8})/i,
        /token.*?([a-zA-Z0-9]{4,10})/i,
        /key.*?(\d{4,8})/i
    ];

    // Promisify GM_xmlhttpRequest
    function gmRequest(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({ ...options, onload: resolve, onerror: reject });
        });
    }

    function extractOTP(text) {
        if (!text) return null;
        for (const pattern of otpPatterns) {
            const matches = text.match(pattern);
            if (matches && matches[1]) {
                return matches[1].replace(/[-\s]/g, '');
            }
        }
        return null;
    }

    function generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async function createTempAccount(address, password, allowedSenders) {
        console.log('Creating temporary email account...');
        try {
            const response = await gmRequest({
                method: "POST",
                url: "https://api.mail.gw/accounts",
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json"
                },
                data: JSON.stringify({ address, password })
            });

            if (response.status === 201) {
                const result = JSON.parse(response.responseText);
                accountId = result.id;
                console.log('Account created successfully:', response.responseText);
            } else if (response.status === 422) {
                console.log('Account already exists, proceeding to authenticate...');
            } else {
                console.error('Failed to create account:', response.status, response.responseText);
                return;
            }

            await authenticateAccount(address, password, allowedSenders);
        } catch (error) {
            console.error('Error creating account:', error);
        }
    }

    async function authenticateAccount(address, password, allowedSenders) {
        console.log('Authenticating account...');
        try {
            const response = await gmRequest({
                method: "POST",
                url: "https://api.mail.gw/token",
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json"
                },
                data: JSON.stringify({ address, password })
            });

            if (response.status === 200) {
                const result = JSON.parse(response.responseText);
                authToken = result.token;
                currentAllowedSenders = allowedSenders;
                console.log('Authentication successful');
                await clearOldAllowedEmails(allowedSenders);
            } else {
                console.error('Authentication failed:', response.status, response.responseText);
            }
        } catch (error) {
            console.error('Error authenticating:', error);
        }
    }

    async function clearOldAllowedEmails(allowedSenders) {
        console.log('Clearing old emails from allowed senders...');
        try {
            const response = await gmRequest({
                method: "GET",
                url: "https://api.mail.gw/messages",
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "authorization": `Bearer ${authToken}`
                }
            });

            if (response.status === 200) {
                const messages = JSON.parse(response.responseText)['hydra:member'];
                if (messages.length > 0) {
                    console.log(`Found ${messages.length} old email(s), filtering allowed senders...`);
                    const toDelete = messages.filter(msg => allowedSenders.includes(msg.from.address));
                    toDelete.forEach(msg => console.log(`Deleting email from allowed sender: ${msg.from.address}`));
                    await Promise.all(toDelete.map(msg => deleteEmail(msg.id)));
                } else {
                    console.log('No old emails to delete');
                }
            } else {
                console.error('Error fetching emails to delete:', response.status, response.responseText);
            }
        } catch (error) {
            console.error('Error fetching emails to delete:', error);
        }
        console.log('Account ready. Call checkForEmails() to start checking.');
    }

    async function deleteEmail(emailId) {
        console.log(`Deleting email with ID: ${emailId}`);
        try {
            const response = await gmRequest({
                method: "DELETE",
                url: `https://api.mail.gw/messages/${emailId}`,
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "authorization": `Bearer ${authToken}`
                }
            });

            if (response.status === 204) {
                console.log(`Successfully deleted email: ${emailId}`);
            } else {
                console.error(`Failed to delete email ${emailId}:`, response.status, response.responseText);
            }
        } catch (error) {
            console.error(`Error deleting email ${emailId}:`, error);
        }
    }

    async function checkForEmails(allowedSenders) {
        if (!authToken) {
            console.error('No auth token available');
            return;
        }

        if (otpFound) {
            console.log('OTP already found, stopping checks.');
            if (checkIntervalId) clearInterval(checkIntervalId);
            return;
        }

        console.log('Checking for emails...');
        try {
            const response = await gmRequest({
                method: "GET",
                url: "https://api.mail.gw/messages",
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "authorization": `Bearer ${authToken}`
                }
            });

            if (response.status === 200) {
                const messages = JSON.parse(response.responseText)['hydra:member'];
                if (messages.length > 0) {
                    console.log(`Found ${messages.length} email(s)`);
                    for (const message of messages) {
                        if (otpFound) break; // stop as soon as OTP is found
                        const senderAddress = message.from.address;
                        if (allowedSenders.includes(senderAddress)) {
                            console.log(`✅ Received email from allowed sender: ${senderAddress}`);
                            console.log('Subject:', message.subject);
                            await fetchFullEmail(message.id, senderAddress, message.subject);
                        } else {
                            console.log(`📧 Email from non-allowed sender: ${senderAddress}, ignoring.`);
                        }
                    }
                } else {
                    console.log('No new emails found');
                }
            } else {
                console.error('Error fetching emails:', response.status, response.responseText);
            }
        } catch (error) {
            console.error('Error checking emails:', error);
        }
    }

    async function fetchFullEmail(messageId, senderAddress, subject) {
        try {
            const response = await gmRequest({
                method: "GET",
                url: `https://api.mail.gw/messages/${messageId}`,
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "authorization": `Bearer ${authToken}`
                }
            });

            if (response.status === 200) {
                const fullEmail = JSON.parse(response.responseText);
                const emailBody = fullEmail.text || fullEmail.html || fullEmail.intro || "";
                const otp = extractOTP(emailBody);

                if (otp) {
                    console.log(`🔐 OTP found: ${otp}`);
                    handleOTPFound(otp, senderAddress, subject);
                } else {
                    console.log(`❌ No OTP found in email from ${senderAddress}`);
                }
            } else {
                console.error('Error fetching full email:', response.status, response.responseText);
            }
        } catch (error) {
            console.error('Error fetching full email:', error);
        }
    }

    function handleOTPFound(otp, sender, subject) {
        console.log(`OTP Extracted: ${otp} from ${sender} - Subject: ${subject}`);
        otpFound = true;

        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            console.log('Stopped periodic email checking after OTP found.');
        }

        localStorage.setItem("otp", otp);
        GM_setValue('latest_otp', otp);
        GM_setValue('otp_timestamp', new Date().toISOString());

        if (_resolveOtp) {
            _resolveOtp(otp);
            _resolveOtp = null;
        }
    }

    function startPeriodicCheck(allowedSenders, checkInterval) {
        currentAllowedSenders = allowedSenders;
        checkIntervalId = setInterval(() => checkForEmails(allowedSenders), checkInterval);
        return new Promise(resolve => { _resolveOtp = resolve; });
    }

    // Resets all state — call between applicants
    function resetTempMail() {
        authToken = null;
        accountId = null;
        otpFound = false;
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }
        currentAllowedSenders = [];
        _resolveOtp = null;
    }

    window.createTempAccount = createTempAccount;
    window.checkForEmails = checkForEmails;
    window.startPeriodicCheck = startPeriodicCheck;
    window.resetTempMail = resetTempMail;



})();
