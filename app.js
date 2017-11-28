const vbApi = require('./nodeVBulletinAPI');

const config = {
	baseUrl: 'http://google.com',
	apiUrl: 'http://google.com/forum/api.php',
	apiKey: 'xXxXxXxX',
	platformname: 'testing script',
	platformversion: '1'
};
	
const user_config = {
	username: 'username',
	password: 'password' //login() uses cleartext while loginMD5() uses md5 hashed password
};


vbApi.api_init(
	config,
	function(status) {
		console.log('got session:');
		console.log(status);
		if (status) {
			
			vbApi.login(
				user_config,
				function(status, data){
					console.log(status);
					if(status === 'redirect_login'){ //if connected
						
						vbApi.getForums(
							function (data) {
								console.log('got forum list:');
								console.log(data);
							}
						);
						
						vbApi.getForum(
							{
								forumid: 565
							},
							function (data) {
								console.log('got forum:');
								console.log(data);
								//console.log(data.threads[0]);
							}
						);
						
						vbApi.getThread(
							{
								threadid: 41257
							},
							function (data) {
								console.log('got thread:');
								console.log(data);
							}
						);
						
						vbApi.newPost(
							{
								threadid: 41257,
								message: 'Wiggle new testings~!'
							},
							function (data) {
								console.log('posted post:');
								console.log(data);
							}
						);
						
						vbApi.newThread(
							{
								forumid: 565,
								subject: 'new Thread test',
								message: 'Just testing again!'
							},
							function (data) {
								console.log('posted thread:');
								console.log(data);
							}
						);
						
						vbApi.closeThread(
							41257,
							function (data) {
								console.log('closed thread:');
								console.log(data);
							}
						);
					}
				}
			);
		} else {
			console.log('could not connect');
		}
	}
);

