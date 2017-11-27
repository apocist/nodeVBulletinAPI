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


exports.call_method = function(method, data, cookies, callback) {
	let that = this;
	let sign = true;
	if(method === 'api_init'){
		sign = false;
	}
	if(!data) {
		data = {};
	}
	
	let reqParams = {
		api_m: method
	};
	
	_.extend(reqParams, data); // Combine the arrays
	
	if(sign === true) {
		if(that.client_session_vars.INITED) {
			//reqParams = utility.ksort(reqParams); // Sort the keys
			
			//var api_signature = utility.http_build_query(reqParams, '', '&'); //Note that we only encode the GET variables, all POSTs can skipp this
			//reqParams.api_sig = md5(api_signature + that.client_session_vars.apiaccesstoken + that.client_session_vars.apiclientid + that.client_session_vars.secret + that.default_vars.apiKey);
			reqParams.api_sig = md5(that.client_session_vars.apiaccesstoken + that.client_session_vars.apiclientid + that.client_session_vars.secret + that.default_vars.apiKey);
		} else {
			console.log('Error: no session variables to sign. Need to initialize.');
		}
	}
	_.extend(reqParams, {
		api_c: that.client_session_vars.apiclientid, //clientId
		api_s: that.client_session_vars.apiaccesstoken, //apiAccessToken (may be empty)
		api_v: that.client_session_vars.apiversion //api version
	});
	
	console.log('Sending:');
	console.log(reqParams);
	
	let options = {
		url: that.default_vars.apiUrl,
		formData: reqParams,
		headers: {
			'User-Agent': that.default_vars.clientname
		}
	};
	
	if(cookies) {
		
		//test adding a cookie
		let j = request.jar();
		for (let variable in cookies) {
			if(cookies.hasOwnProperty(variable)) {
				let cookieString = variable + '=' + cookies[variable];
				let cookie = request.cookie(cookieString);
				j.setCookie(cookie, that.default_vars.baseUrl);
				
				console.log('setting cookie: `'+cookieString+'` for '+ that.default_vars.baseUrl);
			}
		}
		
		
		options.jar = j;//adds cookies to request
	}
	
	request.post(
		options,
		function (error, response, body) {
			if (!error && response.statusCode === 200) {
				//console.log('Got Response');
				
				if(callback){
					callback(JSON.parse(body));
				}
			} else {
				//console.log(response.request);
				console.log('No response');
				if(callback){
					callback({});
				}
			}
		}
	);
};

exports.api_init = function(config, callback) {
	let that = this;
	
	if(
		!config.hasOwnProperty('baseUrl')
		|| !config.hasOwnProperty('apiUrl')
		|| !config.hasOwnProperty('apiKey')
		|| !config.hasOwnProperty('platformversion')
		|| !config.hasOwnProperty('platformversion')
	){
		console.error('Initalization requires a `baseUrl`, `apiUrl`, `apiKey`, `platformname`, and `platformversion`');
		return;
	}
	if(!this.default_vars.baseUrl) {
		this.default_vars.baseUrl = config.baseUrl;
	}
	if(!this.default_vars.apiUrl) {
		this.default_vars.apiUrl = config.apiUrl;
	}
	if(!this.default_vars.apiKey) {
		this.default_vars.apiKey = config.apiKey;
	}
	if(!this.default_vars.uniqueid) {
		this.default_vars.uniqueid = md5(this.default_vars.clientname + this.default_vars.clientversion + config.platformname + config.platformversion + this.getMacAddress());
	}
	this.call_method(
		'api_init',
		{
			clientname: this.default_vars.clientname,
			clientversion: this.default_vars.clientversion,
			platformname: config.platformname,
			platformversion: config.platformversion,
			uniqueid: this.default_vars.uniqueid
		},
		null,
		function(response) {
			if(response){
				//console.log(response);
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
					if(callback){
						callback(true);
					}
				} else {
					if(callback){
						callback(false);
					}
				}
			}
		}
	);
};

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

exports.getErrorMessage = function(response) {
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
 * @param username
 * @param pass
 * @param callback(status, that.user_session_vars)
 */
exports.login = function(username, pass, callback) {
	this.loginMD5(username, md5(pass), callback);
};

/**
 * Attempts to log in a user. Requires the password to be pre md5 hashed.
 * @param username
 * @param md5pass TODO need to secure this more
 * @param callback(status, that.user_session_vars)
 */
exports.loginMD5 = function(username, md5pass, callback) {
	let that = this;
	this.call_method(
		'login_login',
		{
			vb_login_username: username,
			vb_login_md5password: md5pass
		},
		null,
		function(response) {
			if(response){
				let status;
				/**
				redirect_login - (NOT A ERROR) Login successful
				badlogin - Username or Password incorrect. Login failed.
				badlogin_strikes - Username or Password incorrect. Login failed. You have used {X} out of 5 login attempts. After all 5 have been used, you will be unable to login for 15 minutes.
				*/
				status = that.getErrorMessage(response);
				if(response.session){
					that.user_session_vars = response.session;
					if(status === 'redirect_login') {
						that.user_session_vars.username = username;
						that.user_session_vars.logged_in = true;
					}
				}
				if(callback){
					callback(status, that.user_session_vars);
				}
				//console.log(response);
			}
		}
	);
};

exports.logout = function(username, md5pass, callback) {
	let that = this;
	this.call_method(
		'login_logout',
		null,
		null,
		function(response) {
			if(response){
				let status;
				/**
				 'cookieclear' if logout successful
				 */
				status = that.getErrorMessage(response);
				if(response.session){
					that.user_session_vars = response.session;
					if(status === 'cookieclear') {
						that.user_session_vars.username = '';
						that.user_session_vars.logged_in = false;
					}
				}
				if(callback){
					callback(status, that.user_session_vars);
				}
				//console.log(response);
			}
		}
	);
};

/**
 * List every Forum and sub forum available to the user.
 * @param callback([Forum])
 */
exports.getForums = function(callback) {
	this.call_method(
		'api_forumlist',
		null,
		null,
		function(response) {
			if(response){
				if(callback){
					let forums = [];
					for (let forum in response) {
						if(response.hasOwnProperty(forum)){
							forums.push(new Forum(response[forum]));
						}
					}
					callback(forums);
				}
			}
		}
	);
};

exports.getForum = function(forumid, callback) {
	let params = {};
	if(forumid) {
		params.forumid = forumid;
	}
	this.call_method(
		'forumdisplay',
		params,
		null,
		function(response) {
			if(response
				&& response.response
			){
				if(callback){
					callback(new Forum(response.response));
				}
			}
		}
	);
};

/**
 *
 * @param forumid
 * @param callback(Forum)
 */
exports.getForum = function(forumid, callback) {
	let params = {};
	if(forumid) {
		params.forumid = forumid;
	}
	this.call_method(
		'forumdisplay',
		params,
		null,
		function(response) {
			if(
				response
				&& response.response
			){
				if(callback){
					callback(new Forum(response.response));
				}
			}
		}
	);
};

/**
 *
 * @param threadid
 * @param callback(Thread)
 */
exports.getThread = function(threadid, callback) {
	let params = {};
	if(threadid) {
		params.threadid = threadid;
	}
	this.call_method(
		'showthread',
		params,
		null,
		function(response) {
			if(
				response
				&& response.response
			){
				if(callback){
					callback(new Thread(response.response));
				}
			}
		}
	);
};

exports.newPost = function(threadid, message, options, callback) {
	let params = {};
	if(threadid) {
		params.threadid = threadid;
	}
	if(message) {
		params.message = message;
	}
	if (options){
		_.extend(params, options);
	}
	this.call_method(
		'newreply_postreply',
		params,
		null,
		function(response) {
			if(response){
				//success is errormessgae 'redirect_postthanks'
				//reports threadid and postid
				if(callback){
					callback(response);
				}
			}
		}
	);
};

exports.newThread = function(forumid, subject, message, options, callback) {
	let params = {};
	if(forumid) {
		params.forumid = forumid;
	}
	if(subject) {
		params.subject = subject;
	}
	if(message) {
		params.message = message;
	}
	if (options){
		_.extend(params, options);
	}
	this.call_method(
		'newthread_postthread',
		params,
		null,
		function(response) {
			if(response){
				//success is errormessgae 'redirect_postthanks'
				//reports threadid and postid
				if(callback){
					callback(response);
				}
			}
		}
	);
};

exports.closeThread = function(threadid, callback) {
	let params = {};
	let cookies = {};
	if(threadid) {
		//TODO multiple ids are delimited with a '-'. eg: 123-345-456
		cookies.vbulletin_inlinethread = threadid;
		//params.imodcheck = [];
		//params.vbulletin_inlinethread = threadid;
		//params.imodcheck[threadid] = 1;
		//params.imodcheck = threadid
		//params['tlist_imodcheck['+threadid+']'] = threadid;
		/*let imodcheck = [];
		imodcheck[threadid] = 1;
		params.tlist = [];
		params.tlist.push(imodcheck);*/
	}
	this.call_method(
		'inlinemod_close',
		params,
		cookies,
		function(response) {
			if(response){
				//redirect_inline_closed on success
				if(callback){
					callback(response);
				}
			}
		}
	);
};