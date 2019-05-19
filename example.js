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
        console.info('logged in:', userData);

        // We're now also logged in (login() would have rejected otherwise) , we should be able to do much more
        // Here are some more additional actions we can take:

        //console.info('got inbox:', await session.getInbox());

        //console.info('got message:', await session.getMessage(241381));

        //console.info('sent message (returns blank for now):', await session.sendMessage('Apocist', 'API Test', 'This was sent form the new api library as a test', {signature: true}));

        //console.info('got forum list:', await session.getForums());

        //console.info('got forum:', await session.getForum(565));

        //console.info('got thread:', await session.getThread(44740));

        //console.info('got thread:', await session.getMember('apocist'));

        //console.info('closed thread:', await session.modCloseThread(44740));

        /*
        console.info(
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
        console.info(
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