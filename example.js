"use strict";
const VBApi = require('./nodeVBulletinAPI');

example();

async function example() {
    try {
        // Let's connect to the server and start our session
        let session = new VBApi({
            apiUrl: 'http://google.com/forum/api.php',
            apiKey: 'xXxXxXxX',
            platformName: 'testing script',
            platformVersion: '1'
        });

        // To use more command, let's log our session in
        let userData = await session.login({
            username: 'username',
            password: 'password' //login() uses cleartext while loginMD5() uses md5 hashed password
        });

        console.log('logged in:', userData);

        // We're now also logged in (login() would have rejected otherwise) , we should be able to do much more
        // HEre are some more additional actions we can take:

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
        */

        /*
        let data;
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
