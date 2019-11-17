'use strict';
/*const md5 = require('js-md5'),
    request = require('request'),
    url = require('url'),
    uuidV1 = require('uuid/v1'),
    _ = require('underscore'),
    Forum = require('./Forum'),
    Inbox = require('./Inbox'),
    Member = require('./Member'),
    Message = require('./Message'),
    Post = require('./Post'),
    Thread = require('./Thread'),
    {version} = require('./package.json');
*/

import md5 from 'js-md5';
import * as request from 'request';
import * as uuid from 'uuid';
import * as url from 'url';
import * as _ from 'lodash'

import {Post, PostCreateOptions, PostDeleteOptions, PostEditOptions} from './Post'


export interface UserVars {
    dbsessionhash: string
    username: string,
    userid: number,
    loggedIn: boolean
}
export interface CallMethodParameters {
    [key: string]: any,
    clientname?: string,
    clientversion?: string,
    platformname?: string,
    platformversion?: string,
    uniqueid?: string
}

export interface CallMethodCookies {
    [key: string]: string | number
}

export interface CallMethodOptions {
    method: string
    params?: CallMethodParameters,
    cookies?: CallMethodCookies
}

interface VbQuery {
    api_m: string,
    api_c: string,
    api_s: string,
    api_v: string,
    api_sig?: string
}

export class VBApi {
    private initialized: boolean;
    private connectionVars: {
        baseUrl: string;
        apiUrl: string;
        apiKey: string;
        clientName: string;
        platformVersion: string;
        clientVersion: any;
        platformName: string;
        uniqueId: string
    };
    private clientSessionVars: {
        apiVersion: string;
        apiAccessToken: string;
        sessionHash: string;
        apiClientId: string;
        secret: string;
        error: string | null
    } = {
        apiVersion: '',
        apiAccessToken: '',
        sessionHash: '',
        apiClientId: '',
        secret: '',
        error: null
    };
    private userSessionVars: UserVars;
    private waitingForInitializationCallback: (initSuccess: boolean) => void = function () {
    };
    private waitingForInitializationTimeout: NodeJS.Timeout;


    constructor(apiUrl: string, apiKey: string, platformName: string, platformVersion: string) {
        this.initialized = false;
        const urlParts = url.parse(apiUrl);

        const fakeVersion = '0.0.0';

        this.connectionVars = {
            baseUrl: `${urlParts.protocol}//${urlParts.hostname}/`,
            apiUrl: apiUrl || '',
            apiKey: apiKey,
            clientName: 'nodeVBulletinAPI',
            clientVersion: fakeVersion,
            platformName: platformName || '',
            platformVersion: platformVersion || '',
            uniqueId: md5('nodeVBulletinAPI' + fakeVersion + platformName + platformVersion + uuid.v1()),
        };

        this.userSessionVars = {
            dbsessionhash: '',
            username: '',
            userid: 0,
            loggedIn: false
        };

        if (
            this.connectionVars.apiKey !== ''
            && this.connectionVars.apiUrl !== ''
            && this.connectionVars.platformName !== ''
            && this.connectionVars.platformVersion !== ''
        ) {
            this.initialize();
        } else {
            this.clientSessionVars.error = 'apiInit(): Initialization requires a `apiUrl`, `apiKey`, `platformName`, and `platformVersion`';
            this.waitingForInitializationCallback(false);
        }
    }

    private initialize(): void {
        const that = this;
        // Run itself as a self invoked promise that is awaited by nothing. callMethod shall wait until this is finished
        (async function initializeSelf() {
            let error = null;
            let result: VBApi | null = null;

            try {
                let response: {
                    apiversion?: string,
                    apiaccesstoken?: string,
                    sessionhash?: string,
                    apiclientid?: string,
                    secret?: string
                } = await that.callMethod({
                    method: 'api_init',
                    params: {
                        clientname: that.connectionVars.clientName,
                        clientversion: that.connectionVars.clientVersion,
                        platformname: that.connectionVars.platformName,
                        platformversion: that.connectionVars.platformVersion,
                        uniqueid: that.connectionVars.uniqueId
                    }
                });

                if (
                    response.apiversion
                    && response.apiaccesstoken
                    && response.sessionhash
                    && response.apiclientid
                    && response.secret
                ) {
                    that.clientSessionVars = {
                        apiVersion: response.apiversion,
                        apiAccessToken: response.apiaccesstoken,
                        sessionHash: response.sessionhash,
                        apiClientId: response.apiclientid,
                        secret: response.secret,
                        error: null
                    };
                    that.initialized = true;

                    that.waitingForInitializationCallback(true);
                    result = that;
                }

                if (result === null) {
                    that.clientSessionVars.error = VBApi.parseErrorMessage(response) || 'TODO ERROR (api connection did not return a session)';
                    that.waitingForInitializationCallback(false);
                    error = that.clientSessionVars.error;
                }
            } catch (e) {
                that.clientSessionVars.error = e;
                that.waitingForInitializationCallback(false);
                // reject(e);
                error = e;
            }
            return error || result;
        }());
    }

    /**
     * Will return after #initialize() is complete. Otherwise may reject() after 15 second timeout
     * @param {number=5} waitTime
     * @returns {Promise<void>}
     * @fulfill {void}
     * @reject {string} - Error Reason
     */
    async waitForInitialization(waitTime?: number) {
        const that = this;
        waitTime = waitTime || 5;

        return new Promise(async function (resolve, reject) {
            if (that.initialized) {
                resolve();
            } else if (that.clientSessionVars.error !== null) {
                reject(that.clientSessionVars.error);
            } else {
                that.waitingForInitializationTimeout = setTimeout(
                    function () {
                        that.waitingForInitializationCallback = function () {
                        }; // Set back to a blank function
                        if (that.initialized) {
                            resolve();
                        } else {
                            reject('Connection could not be achieved due to timed out: ' + that.clientSessionVars.error);
                        }
                    },
                    waitTime * 1000 // x second timeout
                );
                that.waitingForInitializationCallback = function (initSuccess?: boolean) {
                    if (that.waitingForInitializationTimeout) {
                        clearTimeout(that.waitingForInitializationTimeout);
                    }
                    if (initSuccess === false) {
                        reject(that.clientSessionVars.error);
                    } else {
                        resolve();
                    }
                };
            }
        });
    }

    /**
     *
     * @param {object} options
     * @param {string} options.method - Required action to take
     * @param {?object<string,string>} [options.params={}] - Optional parameter variables
     * @param {?object<string,string>} [options.cookies] - Optional cookie variables
     * @returns {Promise<{}>}
     * @fulfill {{}}
     * @reject {string} - Error Reason
     */
    async callMethod(options: CallMethodOptions): Promise<any> {
        const that = this;
        let sign = true;
        options = options || {
            method: '',
            params: {}
        };
        options.params = options.params || {};
        return new Promise(async function (resolve, reject) {
            try {
                if (!options.method) {
                    reject('callMethod(): requires a supplied method');
                    return;
                }

                // Sign all calls except for api_init
                if (options.method === 'api_init') {
                    sign = false;
                }

                // await a valid session before continuing (skipping waiting on __initialize())
                if (sign === true) {
                    await that.waitForInitialization();
                }

                // Gather our sessions variables together
                let reqParams: VbQuery = {
                    api_m: options.method,
                    api_c: that.clientSessionVars.apiClientId, //clientId
                    api_s: that.clientSessionVars.apiAccessToken, //apiAccessToken (may be empty)
                    api_v: that.clientSessionVars.apiVersion //api version
                };
                _.extend(reqParams, options.params); // Combine the arrays

                if (sign === true) {
                    // Generate a signature to validate that we are authenticated
                    if (that.initialized) {
                        reqParams.api_sig = md5(
                            that.clientSessionVars.apiAccessToken +
                            that.clientSessionVars.apiClientId +
                            that.clientSessionVars.secret +
                            that.connectionVars.apiKey
                        );
                    } else {
                        reject('callMethod(): requires initialization. Not initialized');
                        return;
                    }
                }

                // Create a valid http Request
                let reqOptions: request.Options = {
                    url: that.connectionVars.apiUrl,
                    formData: reqParams,
                    headers: {
                        'User-Agent': that.connectionVars.clientName
                    }
                };

                // Some command require adding a cookie, we'll do that here
                if (options.cookies) {
                    let j = request.jar();
                    for (let variable in options.cookies) {
                        if (options.cookies.hasOwnProperty(variable)) {
                            let cookieString = variable + '=' + options.cookies[variable];
                            let cookie = request.cookie(cookieString);
                            j.setCookie(cookie, that.connectionVars.baseUrl);
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
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     *
     * @param {object} response - Response object from callMethod()
     * @returns {string || null} status - Error message
     */
    static parseErrorMessage(response: any): string | null {
        let value = '';
        if (
            response.hasOwnProperty('response')
            && response.response.hasOwnProperty('errormessage')
        ) {
            if (_.isArray(response.response.errormessage)) {
                value = response.response.errormessage[0]
            } else {
                value = response.response.errormessage;
            }
        }
        return value;
    }

    /**
     * Attempts to log in a user.
     * @param {string} username - Username
     * @param {string} password - clear text password
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects:
     */
    async login(username: string, password: string, options?: {username?: string, password?: string}): Promise<UserVars> {
        options = options || {};
        options.username = username || options.username || '';
        options.password = md5(password || options.password || '');
        return await this.loginMD5('', '', options);
    }

    /**
     * Attempts to log in a user. Requires the password to be pre md5 hashed.
     * @param {string} username - Username
     * @param {string} password - MD5 hashed password
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects:
     */
    async loginMD5(username: string, password: string, options?: {username?: string, password?: string}): Promise<UserVars> {
        let that = this;
        options = options || {};
        options.username = username || options.username || '';
        options.password = password || options.password || '';
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod(
                    {
                        method: 'login_login',
                        params: {
                            vb_login_username: options.username,
                            vb_login_md5password: options.password
                        }
                    }
                );
                /**
                 redirect_login - (NOT A ERROR) Login successful
                 badlogin - Username or Password incorrect. Login failed.
                 badlogin_strikes - Username or Password incorrect. Login failed. You have used {X} out of 5 login attempts. After all 5 have been used, you will be unable to login for 15 minutes.
                 */
                let error = VBApi.parseErrorMessage(response);
                if (response.session) {
                    that.userSessionVars = response.session;
                    if (error === 'redirect_login') {
                        that.userSessionVars.username = options.username;
                        that.userSessionVars.loggedIn = true;
                    }
                }
                if (error === 'redirect_login') {
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
     * @returns {Promise<boolean>} - Returns true on success, otherwise error code is rejected
     * @fulfill {boolean}
     * @reject {string} - Error Reason
     */
    async logout(): Promise<boolean> {
        let that = this;
        return new Promise(async function (resolve, reject) {
            let error;
            try {
                let response = await that.callMethod({
                    method: 'login_logout'
                });
                error = VBApi.parseErrorMessage(response);
                if (response.hasOwnProperty('session') && response.session) {
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
                reject(e);
            }

            if (error) {
                reject(error);
            } else {
                resolve(true)
            }
        });
    }

    /* Post methods */

    createPost(threadId: number, message: string, options?: PostCreateOptions) {
        return Post.createPost(this, threadId, message, options);
    }

    editPost(postId: number, message: string, options?: PostEditOptions) {
        return Post.editPost(this, postId, message, options);
    }

    deletePost(postId: number, threadId: number, options?: PostDeleteOptions) {
        return Post.deletePost(this, postId, threadId, options);
    }
}
