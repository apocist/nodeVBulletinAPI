'use strict';
const VBApi = require('./nodeVBulletinAPI');

example();

async function example() {
    try {
        // Let's connect to the server and start our session
        let session = new VBApi(
            'http://google.com/forum/api.php',
            'xXxXxXxX',
            'testing script',
            '1'
        );

        // To use more command, let's log our session in
        // login() uses cleartext while loginMD5() uses md5 hashed password
        let userData = await session.login('username', 'password');
        console.log('logged in:', userData);

        // We're now also logged in (login() would have rejected otherwise) , we should be able to do much more
        // Here are some more additional actions we can take:

        //console.log('got forum list:', await session.getForums());

        //console.log('got forum:', await session.getForum(565));

        //console.log('got thread:', await session.getThread(44740));

        //console.log('closed thread:', await session.modCloseThread(44740));

        /*
        console.log(
            await session.newPost(
                44740,
                'Wiggle new testings~!',
                {
                    signature: true
                }
            )
        );
        */

        /*
        console.log(
            await session.newThread(
                565,
                'new Thread test',
                'Just testing again!'
            )
        );
        */


    } catch (e) {
        console.error(e);
    }
}