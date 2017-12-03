const md5 = require('js-md5'),
	os = require('os'),
	request = require('request'),
	_ = require('underscore'),
	Forum = require('./Forum'),
	Post = require('./Post'),
	Thread = require('./Thread');

exports.default_vars = {
	baseUrl: '', //Needed for cookie related commands
	apiUrl: '',
	apiKey: '',
	clientname: 'nodeVBulletinAPI',
	clientversion: '0.0.1',
	uniqueid: ''
};

exports.client_session_vars = {
	apiversion: '',
	apiaccesstoken: '',
	sessionhash: '',
	apiclientid: '',
	secret: '',
	INITED: false
};

exports.user_session_vars = {
	username: '',
	userid: 0,
	logged_in: false
};

/**
 *
 * @param {Object} options
 * @param {string} options.method
 * @param {Object} options.params
 * @param {Object} options.cookies
 * @param {Function} callback - Returns a Object to be parse elsewhere
 * @param {string} callback.error
 * @param {Object} callback.data - Returns a Object to be parse elsewhere
 */
exports.call_method = function(options, callback) {
	let that = this;
	let sign = true;
	options = options || {};
	options.params = options.params || {};
	if(!options.method){
		if(callback) callback('call_method(): requires a supplied method');
		return;
	}
	
	// Sign all calls except for api_init
	if(options.method === 'api_init') sign = false;
	
	let reqParams = {
		api_m: options.method,
		api_c: that.client_session_vars.apiclientid, //clientId
		api_s: that.client_session_vars.apiaccesstoken, //apiAccessToken (may be empty)
		api_v: that.client_session_vars.apiversion //api version
	};
	_.extend(reqParams, options.params); // Combine the arrays
	
	if(sign === true) {
		// Generate a signature to validate that we are authenticated
		if(that.client_session_vars.INITED) {
			reqParams.api_sig = md5(that.client_session_vars.apiaccesstoken + that.client_session_vars.apiclientid + that.client_session_vars.secret + that.default_vars.apiKey);
		} else {
			if(callback) callback('call_method(): no session variables to sign. Need to initialize via api_init().');
			return;
		}
	}
	
	let reqOptions = {
		url: that.default_vars.apiUrl,
		formData: reqParams,
		headers: {
			'User-Agent': that.default_vars.clientname
		}
	};
	
	// Some command require adding a cookie, we'll do that here
	if(options.cookies) {
		let j = request.jar();
		for (let variable in options.cookies) {
			if(options.cookies.hasOwnProperty(variable)) {
				let cookieString = variable + '=' + options.cookies[variable];
				let cookie = request.cookie(cookieString);
				j.setCookie(cookie, that.default_vars.baseUrl);
			}
		}
		reqOptions.jar = j;// Adds cookies to the request
	}
	
	request.post(
		reqOptions,
		function (error, response, body) {
			if (!error && response.statusCode === 200) {
				if(callback) callback(null, JSON.parse(body))
			} else {
				//console.log('No response');
				if(callback) callback('call_method(): no response.')
			}
		}
	);
};

/**
 * Initialize a vb api connection .This needs to be called for the first time
 * @param {Object} options
 * @param {string} options.apiUrl
 * @param {string} options.apiKey
 * @param {string} options.platformname
 * @param {string} options.platformversion
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Object} callback.success
 */
exports.api_init = function(options, callback) {
	let that = this;
	options = options || {};
	if(
		!options.hasOwnProperty('apiUrl')
		|| !options.hasOwnProperty('apiKey')
		|| !options.hasOwnProperty('platformname')
		|| !options.hasOwnProperty('platformversion')
	){
		console.error('api_init(): Initalization requires a `apiUrl`, `apiKey`, `platformname`, and `platformversion`');
		if(callback) callback('TODO ERROR');
	}
	
	let regex_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
	let url_parts = regex_url.exec( options.apiUrl );
	that.default_vars.baseUrl = that.default_vars.baseUrl || url_parts[1]+':'+url_parts[2]+url_parts[3]+'/';
	that.default_vars.apiUrl = that.default_vars.apiUrl || options.apiUrl;
	that.default_vars.apiKey = that.default_vars.apiKey || options.apiKey;
	that.default_vars.uniqueid = that.default_vars.uniqueid || md5(that.default_vars.clientname + that.default_vars.clientversion + options.platformname + options.platformversion + that.getMacAddress());

	that.call_method(
		{
			method: 'api_init',
			params: {
				clientname: that.default_vars.clientname,
				clientversion: that.default_vars.clientversion,
				platformname: options.platformname,
				platformversion: options.platformversion,
				uniqueid: that.default_vars.uniqueid
			}
		},
		function(error, response) {
			if(response){
				that.client_session_vars.apiversion = '';
				that.client_session_vars.apiaccesstoken = '';
				that.client_session_vars.sessionhash = '';
				that.client_session_vars.apiclientid = '';
				that.client_session_vars.secret = '';
				that.client_session_vars.INITED = false;
				if(
					response.apiversion
					&& response.apiaccesstoken
					&& response.sessionhash
					&& response.apiclientid
					&& response.secret
				) {
					that.client_session_vars.apiversion = response.apiversion;
					that.client_session_vars.apiaccesstoken = response.apiaccesstoken;
					that.client_session_vars.sessionhash = response.sessionhash;
					that.client_session_vars.apiclientid = response.apiclientid;
					that.client_session_vars.secret = response.secret;
					that.client_session_vars.INITED = true;
					if(callback) callback(null, true);
				} else {
					if(callback) callback('TODO ERROR');
				}
			}
		}
	);
};

/**
 * Return a Mac address of a network interface for machine identification
 * @returns {string} macAddress
 */
exports.getMacAddress = function() {
	let interfaces = os.networkInterfaces();
	let address;
	loop1:
	for (let k in interfaces) {
		if(interfaces.hasOwnProperty(k)) {
			for (let k2 in interfaces[k]) {
				if(interfaces[k].hasOwnProperty(k2)) {
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
};

/**
 *
 * @param {Object} response
 * @returns {string} status - message
 */
exports.parseErrorMessage = function(response) {
	if(
		response.hasOwnProperty('response')
		&& response.response.hasOwnProperty('errormessage')
		&& response.response.errormessage.hasOwnProperty(0)
	){
		return response.response.errormessage[0];
	}
	return '';
};

/**
 * Attempts to log in a user.
 * @param {Object} options
 * @param {string} options.username - username
 * @param {string} options.password - clear text password
 * @param {Function} callback
 * @param {string} callback.error - (badlogin/badlogin_strikes)
 * @param {Object} callback.data
 */
exports.login = function(options, callback) {
	options = options || {};
	options.password = md5(options.password || '');
	this.loginMD5(options, callback);
};

/**
 * Attempts to log in a user. Requires the password to be pre md5 hashed.
 * @param {Object} options
 * @param {string} options.username - username
 * @param {string} options.password - md5 hashed password TODO need to secure this more
 * @param {Function} callback
 * @param {string} callback.error - badlogin/badlogin_strikes
 * @param {Object} callback.data
 */
exports.loginMD5 = function(options, callback) {
	let that = this;
	options = options || {};
	that.call_method(
		{
			method: 'login_login',
			params: {
				vb_login_username: options.username || '',
				vb_login_md5password: options.password || ''
			}
		},
		function(error, response) {
			if(response){
				/**
				redirect_login - (NOT A ERROR) Login successful
				badlogin - Username or Password incorrect. Login failed.
				badlogin_strikes - Username or Password incorrect. Login failed. You have used {X} out of 5 login attempts. After all 5 have been used, you will be unable to login for 15 minutes.
				*/
				error = that.parseErrorMessage(response);
				if(response.session){
					that.user_session_vars = response.session;
					if(error === 'redirect_login') {
						that.user_session_vars.username = options.username;
						that.user_session_vars.logged_in = true;
					}
				}
				if(error === 'redirect_login') {
					error = null;
				}
				if(callback) callback(error, that.user_session_vars);
			}
		}
	);
};

/**
 * Attempts to log the user out.
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Object} callback.user_session_vars
 */
exports.logout = function(callback) {
	let that = this;
	that.call_method(
		{
			method: 'login_logout'
		},
		function(error, response) {
			if(response){
				error = that.parseErrorMessage(response);
				if(response.session){
					that.user_session_vars = response.session;
					if(error === 'cookieclear') {
						that.user_session_vars.username = '';
						that.user_session_vars.logged_in = false;
					}
				}
				if(error === 'cookieclear') {
					error = null;
				}
				if(callback)callback(error, that.user_session_vars);
			}
		}
	);
};

/**
 * List every Forum and sub forum available to the user.
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Forum[]} callback.data - Array of Forum objects
 */
exports.getForums = function(callback) {
	this.call_method(
		{
			method: 'api_forumlist'
		},
		function(error, response) {
			if(response){
				if(callback){
					let forums = [];
					for (let forum in response) {
						if(response.hasOwnProperty(forum)){
							forums.push(new Forum(response[forum]));
						}
					}
					callback(null, forums);//TODO need to handle errors
				}
			}
		}
	);
};


/**
 * List detailed info about a forum and it's subforums and threads
 * @param {Object} options
 * @param {number} options.forumid - forumid
 * TODO note additional options
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Forum} callback.data - Returns a Forum object
 */
exports.getForum = function(options, callback) {
	options = options || {};
	options.forumid = options.forumid || ''; //required
	this.call_method(
		{
			method: 'forumdisplay',
			params: options
		},
		function(error, response) {
			if(
				response
				&& response.response
			){
				if(callback){
					callback(null, new Forum(response.response));// TODO need to handle errors
				}
			}
		}
	);
};

/**
 * List detailed information about a Thread and it's Posts
 * @param {Object} options
 * @param {number} options.threadid - threadid
 * TODO note additional options
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Thread} callback.data - Returns a Thread object
 */
exports.getThread = function(options, callback) {
	options = options || {};
	options.threadid = options.threadid || ''; //required
	this.call_method(
		{
			method: 'showthread',
			params: options
		},
		function(error, response) {
			if(
				response
				&& response.response
			){
				if(callback) callback(null, new Thread(response.response));// TODO need to handle errors
			}
		}
	);
};

/**
 * Attempts to submit a new Post into a specified Thread
 * @param {Object} options
 * @param {number} options.threadid - threadid
 * @param {string} options.message - message
 * TODO note additional options
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Object} callback.data - Returns a unhandled response currently
 */
exports.newPost = function(options, callback) {
	options = options || {};
	options.threadid = options.threadid || ''; //required
	options.message = options.message || ''; //required
	this.call_method(
		{
			method: 'newreply_postreply',
			params: options
		},
		function(error, response) {
			if(response){
				//success is errormessgae 'redirect_postthanks'
				//reports threadid and postid
				if(callback) callback(null, response);// TODO handle errors
			}
		}
	);
};

/**
 * Attempts to submit a new Thread into a specified Forum
 * @param {Object} options
 * @param {number} options.forumid - forumid
 * @param {string} options.subject - subject
 * @param {string} options.message - message
 * TODO note additional options
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Object} callback.data - Returns a unhandled response currently
 */
exports.newThread = function(options, callback) {
	options = options || {};
	options.forumid = options.forumid || ''; //required
	options.subject = options.subject || ''; //required
	options.message = options.message || ''; //required
	this.call_method(
		{
			method: 'newthread_postthread',
			params: options
		},
		function(error, response) {
			if(response){
				//success is errormessgae 'redirect_postthanks'
				//reports threadid and postid
				if(callback) callback(null, response);// TODO handle errors
			}
		}
	);
};

/**
 * Attempts to close a specific Thread. Requires a user to have a 'inline mod' permissions
 * @param {number} threadid
 * TODO note additional options
 * @param {Function} callback
 * @param {string} callback.error
 * @param {Object} callback.data - Returns a unhandled response currently
 */
exports.closeThread = function(threadid, callback) {
	let cookies = {};
	if(threadid) {
		//TODO multiple ids are delimited with a '-'. eg: 123-345-456
		cookies.vbulletin_inlinethread = threadid;
	}
	this.call_method(
		{
			method: 'inlinemod_close',
			cookies: cookies || {}
		},
		function(error, response) {
			if(response){
				//redirect_inline_closed on success
				if(callback) callback(null, response);//TODO handle errors
			}
		}
	);
};