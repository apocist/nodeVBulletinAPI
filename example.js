const vbApi = require('./nodeVBulletinAPI');

const config = {
    apiUrl: 'http://google.com/forum/api.php',
    apiKey: 'xXxXxXxX',
    platformName: 'testing script',
    platformVersion: '1'
};

const user_config = {
    username: 'username',
    password: 'password' //login() uses cleartext while loginMD5() uses md5 hashed password
};

startup();

async function startup() {
    try {
        await vbApi.apiInit(config);
        let userData = await vbApi.login(user_config);
        await loginConfirmed(userData);
    } catch (e) {
        console.error(e);
    }
}

async function loginConfirmed(userData) {
    console.log('logged in', userData);

    //console.log('got forum list:', await vbApi.getForums());

    //console.log('got forum:', await vbApi.getForum({forumid: 565}));

    //console.log('got thread:', await vbApi.getThread({threadid: 41257}));

    /*vbApi.newPost(
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
    );*/
}
