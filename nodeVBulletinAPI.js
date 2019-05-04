const md5 = require('js-md5'),
    os = require('os'),
    request = require('request'),
    _ = require('underscore'),
    Forum = require('./Forum'),
    Post = require('./Post'),
    Thread = require('./Thread');

/**
 *
 * @type {VBApi}
 */
module.exports = class VBApi {
    /**
     * Initialize a vb api connection .This needs to be called for the first time
     * @param options
     */
    constructor(options) {
        this.defaultVars = {
            baseUrl: '', //Needed for cookie related commands
            apiUrl: '',
            apiKey: '',
            clientName: 'nodeVBulletinAPI',
            clientVersion: '0.0.1',
            uniqueId: ''
        };

        this.clientSessionVars = {
            apiVersion: '',
            apiAccessToken: '',
            sessionHash: '', // Unused?
            apiClientId: '',
            secret: '',
            inited: false
        };

        this.userSessionVars = {
            username: '',
            userid: 0,
            loggedIn: false
        };

        this.initialOptions = options || {};

    }

    /**
     * Initialize a vb api connection. This needs to be called for the first time
     * @param {{}} options
     */
    initialize(options) {
        let that = this;
        return new Promise(async function (resolve, reject) {
            if (
                !that.initialOptions.hasOwnProperty('apiUrl')
                || !that.initialOptions.hasOwnProperty('apiKey')
                || !that.initialOptions.hasOwnProperty('platformName')
                || !that.initialOptions.hasOwnProperty('platformVersion')
                || that.initialOptions.platformName === ''
                || that.initialOptions.platformVersion === ''
            ) {
                reject('apiInit(): Initialization requires a `apiUrl`, `apiKey`, `platformName`, and `platformVersion`');
            } else {

                let regex_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
                let url_parts = regex_url.exec(that.initialOptions.apiUrl);
                that.defaultVars.baseUrl = that.defaultVars.baseUrl || url_parts[1] + ':' + url_parts[2] + url_parts[3] + '/';
                that.defaultVars.apiUrl = that.defaultVars.apiUrl || that.initialOptions.apiUrl;
                that.defaultVars.apiKey = that.defaultVars.apiKey || that.initialOptions.apiKey;
                that.defaultVars.uniqueId = that.defaultVars.uniqueId || md5(that.defaultVars.clientName + that.defaultVars.clientVersion + that.initialOptions.platformName + that.initialOptions.platformVersion + that.constructor.getMacAddress() + new Date().getTime());

                try {
                    let response = await that.callMethod({
                        method: 'api_init',
                        params: {
                            clientname: that.defaultVars.clientName,
                            clientversion: that.defaultVars.clientVersion,
                            platformname: that.initialOptions.platformName,
                            platformversion: that.initialOptions.platformVersion,
                            uniqueid: that.defaultVars.uniqueId
                        }
                    });

                    that.clientSessionVars.apiVersion = '';
                    that.clientSessionVars.apiAccessToken = '';
                    that.clientSessionVars.sessionHash = '';
                    that.clientSessionVars.apiClientId = '';
                    that.clientSessionVars.secret = '';
                    that.clientSessionVars.inited = false;
                    if (
                        response.apiversion
                        && response.apiaccesstoken
                        && response.sessionhash
                        && response.apiclientid
                        && response.secret
                    ) {
                        that.clientSessionVars.apiVersion = response.apiversion;
                        that.clientSessionVars.apiAccessToken = response.apiaccesstoken;
                        that.clientSessionVars.sessionHash = response.sessionhash;
                        that.clientSessionVars.apiClientId = response.apiclientid;
                        that.clientSessionVars.secret = response.secret;
                        that.clientSessionVars.inited = true;
                        resolve(that);
                    } else {
                        let error = that.parseErrorMessage(response) || 'TODO ERROR (api connection did not return a session)';
                        reject(error);
                    }
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    /**
     *
     * @param {object} options
     * @param {string} options.method - Required action to take
     * @param {object<string,string>} [options.params={}] - Optional parameter variables
     * @param {?object<string,string>} [options.cookies] - Optional cookie variables
     * @returns {Promise<{}>}
     */
    callMethod(options) {
        let that = this;
        let sign = true;
        options = options || {};
        options.params = options.params || {};
        return new Promise(function (resolve, reject) {
            if (!options.method) {
                reject('callMethod(): requires a supplied method');
                return;
            }

            // Sign all calls except for api_init
            if (options.method === 'api_init') sign = false;

            let reqParams = {
                api_m: options.method,
                api_c: that.clientSessionVars.apiClientId, //clientId
                api_s: that.clientSessionVars.apiAccessToken, //apiAccessToken (may be empty)
                api_v: that.clientSessionVars.apiVersion //api version
            };
            _.extend(reqParams, options.params); // Combine the arrays

            if (sign === true) {
                // Generate a signature to validate that we are authenticated
                if (that.clientSessionVars.inited) {
                    reqParams.api_sig = md5(that.clientSessionVars.apiAccessToken + that.clientSessionVars.apiClientId + that.clientSessionVars.secret + that.defaultVars.apiKey);
                } else {
                    return;
                }
            }

            let reqOptions = {
                url: that.defaultVars.apiUrl,
                formData: reqParams,
                headers: {
                    'User-Agent': that.defaultVars.clientName
                }
            };

            // Some command require adding a cookie, we'll do that here
            if (options.cookies) {
                let j = request.jar();
                for (let variable in options.cookies) {
                    if (options.cookies.hasOwnProperty(variable)) {
                        let cookieString = variable + '=' + options.cookies[variable];
                        let cookie = request.cookie(cookieString);
                        j.setCookie(cookie, that.defaultVars.baseUrl);
                    }
                }
                reqOptions.jar = j;// Adds cookies to the request
            }

            request.post(
                reqOptions,
                function (error, response, body) {
                    if (!error && response.statusCode === 200) {
                        resolve(JSON.parse(body));
                    } else {
                        //console.log('No response');
                        reject('callMethod(): no response.');
                    }
                }
            );


        });
    }

    /**
     * Attempts to log in a user.
     * @param {object} options
     * @param {string} options.username - Username
     * @param {string} options.password - clear text password TODO need to secure this more?
     * @returns {Promise<{}>} TODO add typedef for userVars
     */
    async login(options) {
        options = options || {};
        options.password = md5(options.password || '');
        return await this.loginMD5(options);
    }

    /**
     *
     * Attempts to log in a user. Requires the password to be pre md5 hashed.
     * @param {object} options
     * @param {string} options.username - Username
     * @param {string} options.password - MD5 hashed password TODO need to secure this more?
     * @returns {Promise<{}>} TODO add typedef for userVars
     */
    async loginMD5(options) {
        let that = this;
        options = options || {};
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod(
                    {
                        method: 'login_login',
                        params: {
                            vb_login_username: options.username || '',
                            vb_login_md5password: options.password || ''
                        }
                    }
                );
                /**
                 redirect_login - (NOT A ERROR) Login successful
                 badlogin - Username or Password incorrect. Login failed.
                 badlogin_strikes - Username or Password incorrect. Login failed. You have used {X} out of 5 login attempts. After all 5 have been used, you will be unable to login for 15 minutes.
                 */
                let error = that.constructor.parseErrorMessage(response);
                if (response.session) {
                    that.userSessionVars = response.session;
                    if (error === 'redirect_login') {
                        that.userSessionVars.username = options.username;
                        that.userSessionVars.loggedIn = true;
                    }
                }
                if (error === 'redirect_login') {
                    error = null;
                }
                if (error === null) {
                    resolve(that.userSessionVars);
                } else {
                    reject(error);
                }

            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to log the user out.
     * @returns {boolean || string} - Returns true on success, otherwise error code is returned
     */
    async logout() {
        let that = this;
        let error;
        try {
            let response = await that.callMethod({
                method: 'login_logout'
            });
            error = that.constructor.parseErrorMessage(response);
            if (response.session) {
                that.userSessionVars = response.session;
                if (error === 'cookieclear') {
                    that.userSessionVars.username = '';
                    that.userSessionVars.loggedIn = false;
                }
            }
            if (error === 'cookieclear') {
                error = null;
            }
        } catch (e) {
            error = e.message;
        }
        return error || true;
    }

    /**
     * Return a Mac address of a network interface for machine identification
     * @returns {string} macAddress
     */
    static getMacAddress() {
        let interfaces = os.networkInterfaces();
        let address;
        loop1:
            for (let k in interfaces) {
                if (interfaces.hasOwnProperty(k)) {
                    for (let k2 in interfaces[k]) {
                        if (interfaces[k].hasOwnProperty(k2)) {
                            let addressI = interfaces[k][k2];
                            if (
                                (addressI.family === 'IPv4' || addressI.family === 'IPv6')
                                && addressI.hasOwnProperty('internal')
                                && addressI.internal === false
                                && addressI.hasOwnProperty('mac')
                                && addressI.mac !== '00:00:00:00:00:00'
                            ) {
                                address = addressI.mac;
                                break loop1;
                            }
                        }
                    }
                }
            }
        return address;
    }

    /**
     *
     * @param {object} response - Response object from callMethod()
     * @returns {string} status - Error message
     */
    static parseErrorMessage(response) {
        let retur = '';
        if (
            response.hasOwnProperty('response')
            && response.response.hasOwnProperty('errormessage')
        ) {
            if (_.isArray(response.response.errormessage)) {
                retur = response.response.errormessage[0]
            } else {
                retur = response.response.errormessage;
            }
        }
        return retur;
    }

    /**
     * List every Forum and sub forum available to the user.
     * @returns {Promise<Forum[]>} - Array of Forum objects
     */
    getForums() {
        let that = this;
        return new Promise(async function (resolve, reject) {
            let forums = [];
            try {
                let response = await that.callMethod(
                    {
                        method: 'api_forumlist'
                    });

                if (response) {
                    for (let forum in response) {
                        if (response.hasOwnProperty(forum)) {
                            forums.push(new Forum(response[forum]));
                        }
                    }
                }
            } catch (e) {
                reject(e);
            }
            resolve(forums);
        });
    }

    /**
     * List detailed info about a forum and it's sub-forums and threads
     * @param {object} options
     * @param {number} options.forumid - Forum id
     * TODO note additional options
     * @returns {Promise<Forum>} - Returns a Forum object
     */
    getForum(options) {
        let that = this;
        options = options || {};
        options.forumid = options.forumid || ''; //required

        return new Promise(async function (resolve, reject) {
            let forum;
            try {
                let response = await that.callMethod({
                    method: 'forumdisplay',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    forum = new Forum(response.response);
                }
            } catch (e) {
                reject(e);
            }
            resolve(forum);
        });
    }

    /**
     * List detailed information about a Thread and it's Posts
     * @param {object} options
     * @param {number} options.threadid - Thread id
     * TODO note additional options
     * @returns {Promise<Thread>} - Returns a Thread object
     */
    getThread(options) {
        let that = this;
        options = options || {};
        options.threadid = options.threadid || ''; //required

        return new Promise(async function (resolve, reject) {
            let thread;
            try {
                let response = await that.callMethod({
                    method: 'showthread',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Thread(response.response);
                }
            } catch (e) {
                reject(e);
            }
            resolve(thread);
        });
    }

    /**
     * Attempts to submit a new Post into a specified Thread
     * @param {object} options
     * @param {number} options.threadid - Thread id
     * @param {string} options.message - Post Message
     * @param {boolean=} options.signature  - Optionally append your signature
     * TODO note additional options
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    async newPost(options) {
        let that = this;
        options = options || {};
        options.threadid = options.threadid || ''; //required
        options.message = options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {

            try {
                let response = await that.callMethod({
                    method: 'newreply_postreply',
                    params: options
                });
                let possibleError = that.parseErrorMessage(response);
                //success is errormessgae 'redirect_postthanks'
                //reports threadid and postid
                if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {
                    resolve(response.show);
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to edit an existing Post
     * @param {object} options
     * @param {number} options.postid - Post id
     * @param {string} options.message - Post Message
     * @param {string=} options.reason - Reason for editing
     * @param {boolean=} options.signature - Optionally append your signature
     * TODO note additional options
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    editPost(options) {
        let that = this;
        options = options || {};
        options.postid = options.postid || ''; //required
        options.message = options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_updatepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //success is errormessgae 'redirect_editthanks'
                if (possibleError === 'redirect_editthanks') {
                    resolve({postid: options.postid});
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO untested - does not seem to function yet
     * Attempts to delete an existing Post
     * @param {object} options
     * @param {number} options.postid - Post id
     * @param {number} options.threadid - Thread id
     * @param {string=} options.reason - Reason for deleting
     * TODO note additional options
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    deletePost(options) {
        let that = this;
        options = options || {};
        options.postid = options.postid || ''; //required

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_deletepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //unknown response
                if (
                    possibleError === 'redirect_deletepost'
                    && response.hasOwnProperty('show')
                ) {
                    //console.log('response', response);
                    resolve(response.show);
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to submit a new Thread into a specified Forum
     * @param {object} options
     * @param {number} options.forumid - Forum Id
     * @param {string} options.subject - Post/Thread Subject
     * @param {string} options.message - Post Message
     * TODO note additional options
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    newThread(options) {
        let that = this;
        options = options || {};
        options.forumid = options.forumid || ''; //required
        options.subject = options.subject || ''; //required
        options.message = options.message || ''; //required

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'newthread_postthread',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //success is errormessgae 'redirect_postthanks'
                //reports threadid and postid
                if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {
                    resolve(response.show);
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadid - Id of Thread to close
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    modCloseThread(threadid) {
        let that = this;
        let cookies = {};
        if (threadid) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadid;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_close',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to open a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadid - Id of Thread to open
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    modOpenThread(threadid) {
        let that = this;
        let cookies = {};
        if (threadid) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadid;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_open',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to delete a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadid - Id of Thread to close
     * @returns {Promise<Object || String>} - Returns a unhandled response currently
     */
    modDeleteThread(threadid) {
        let that = this;
        let cookies = {};
        if (threadid) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadid;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_dodeletethreads',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }
};
