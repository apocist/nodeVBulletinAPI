const vbApi = require('./nodeVBulletinAPI');

const config = {
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
	function(error, status) {
		if (status) {
			vbApi.login(
				user_config,
				loginConfirmed
			);
		} else {
			console.log('could not connect');
		}
	}
);

function loginConfirmed(error) {
	if(error === null) {
		
		vbApi.getForums(
			function (error, data) {
				console.log('got forum list:');
				console.log(data);
			}
		);
		
		vbApi.getForum(
			{
				forumid: 565
			},
			function (error, data) {
				console.log('got forum:');
				console.log(data);
				//console.log(data.threads[0]);
			}
		);
		
		vbApi.getThread(
			{
				threadid: 41257
			},
			function (error, data) {
				console.log('got thread:');
				console.log(data);
			}
		);
		
		vbApi.newPost(
			{
				threadid: 41257,
				message: 'Wiggle new testings~!'
			},
			function (error, data) {
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
			function (error, data) {
				console.log('posted thread:');
				console.log(data);
			}
		);
		
		vbApi.modCloseThread(
			41257,
			function (error, data) {
				console.log('closed thread:');
				console.log(data);
			}
		);
	} else {
		console.log('could not login: '+error);
	}
}
