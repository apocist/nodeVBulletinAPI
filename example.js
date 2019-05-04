const VBApi = require('./nodeVBulletinAPI');

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
        // Let's connect to the server and start our session
        let session = new VBApi(config);
        session.initialize(); // FIXME should all happen on new

        // To use more command, let's log our session in
        console.log('logged in:', await session.login(user_config));

        //Some more additional actions we can take:

        //console.log('got forum list:', await session.getForums());

        //console.log('got forum:', await session.getForum({forumid: 565}));

        //console.log('got thread:', await session.getThread({threadid: 41257}));

        //console.log('closed thread:', await session.modCloseThread(41257));

        /*
        let data;
        data = await session.newPost({
            threadid: 41257,
            message: 'Wiggle new testings~!'
        });
        console.log('posted post:', data);

        data = await session.newThread({
            forumid: 565,
            subject: 'new Thread test',
            message: 'Just testing again!'
        });
        console.log('posted thread:', data);


        */

    } catch (e) {
        console.error(e);
    }
}
