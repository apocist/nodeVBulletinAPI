'use strict';
const {VBApi} = require('./dist/umd/VBApi');

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

        // Get the Inbox/private Message list of folder 0
        //console.info('got inbox:', await session.getInbox());

        // Empty the default folder (0) of all messages from 2019.05.18 and prior
        //console.info('emptied inbox (returns blank for now):', await session.emptyInbox(new Date('2019.05.18')));

        // Get the details of Message 241381
        //console.info('got message:', await session.getMessage(241381));

        // Send a Message to user 'Apocsit'
        //console.info('sent message (returns blank for now):', await session.sendMessage('Apocist', 'API Test', 'This was sent form the new api library as a test', {signature: true}));

        // Get a list of Forums and Threads on the homepage
        //console.info('got forum list:', await session.getForums());

        // Get the details of a specific Forum and a list of it's subForums and Threads
        //console.info('got forum:', await session.getForum(565));

        // Get the details of a specific Thread and a list of it's Posts
        //console.info('got thread:', await session.getThread(44740));

        // Attempt to Close a thread, works only if the logged in user has permissions of an inline mod
        //console.info('closed thread:', await session.modCloseThread(44740));

        // Get the details of a specific Member by username
        //console.info('got member:', await session.getMember('apocist'));


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