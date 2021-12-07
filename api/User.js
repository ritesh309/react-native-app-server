const express = require( 'express' );
const bcrypt = require( 'bcryptjs' );
const cookieParser = require( 'cookie-parser' );
require( "../db/connDB" );
//Schema
const User = require( "../models/User" );
const UserVerification = require( '../models/UserVerification' );


const path = require( "path" )
const router = express.Router();

//email vaidator
const validator = require( "email-validator" );

router.use( cookieParser() );

//nodemailer sends mail 
const nodemailer = require( "nodemailer" );
const { v4: uuidv4 } = require( "uuid" );

//nodemailer using for mailing
let transporter = nodemailer.createTransport( {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.PASSWORD
    }
} );

//testing transporter for mail 
transporter.verify( ( error, success ) => {
    if ( error ) {
        console.log( error )
    } else {
        console.log( "Ready for sending msg" );
        console.log( success );
    }
} );

// Student REgistration DATA 

router.post( '/signup', async ( req, res ) => {

    let { fullName, dateOfBirth, email, phone, password, confirmPassword } = req.body;
    email = email.trim();
    dateOfBirth = dateOfBirth.trim();
    password = password.trim();

    if ( !fullName || !email || !phone || !password || !confirmPassword ) {
        res.json( {
            status: "FAILED",
            message: "Fill All Fields"
        } );
    } else if ( !/^[a-zA-Z ]+$/.test( fullName ) ) {
        res.json( {
            status: "FAILED",
            message: "Inavalid Name"
        } );
    } else if ( !validator.validate( email ) ) {
        res.json( {
            status: "FAILED",
            message: "Inavalid Email"
        } );
    }
    else if ( !new Date( dateOfBirth ).getUTCDate() ) {
        res.json( {
            status: "FAILED",
            message: "Inavalid dateOfBirth"
        } );
    } else if ( password.length < 6 ) {
        res.json( {
            status: "FAILED",
            message: "Password is too short !"
        } );
    } else if ( password !== confirmPassword ) {
        res.json( {
            status: "FAILED",
            message: "Password does not match !"
        } );
    } else {
        //Creating if user already exists
        User.find( { email } ).then( result => {
            if ( result.length ) {
                res.json( {
                    status: "FAILED",
                    message: "Email already exists !"
                } );
            } else {
                //Try to ctreate new user`
                //hashing password
                const saltRounds = 10;
                bcrypt.hash( password, saltRounds ).then( hashedPassword => {
                    const newUser = new User( {
                        fullName,
                        email,
                        phone,
                        dateOfBirth,
                        password: hashedPassword,
                        verified: false,

                    } )

                    newUser.save()
                        .then( ( result ) => {
                            //Send verification message
                            sendVerificationEmail( result, res );

                        } )
                        .catch( error => {
                            console.log( error )
                            res.json( {
                                status: "FAILED",
                                message: "Error in Saving User account!"
                            } );
                        } )

                } ).catch( error => {
                    console.log( error );
                    res.json( {
                        status: "FAILED",
                        message: "Error in hashing !"
                    } );
                } )
            }

        } ).catch( err => {
            console.log( err );
            res.json( {
                status: "FAILED",
                message: "An Error occurred while Checking Users!"
            } );
        } )

    }

} );

//Send verification email

const sendVerificationEmail = ( { _id, email }, res ) => {
    //Url to send the mail
    const uniqueString = uuidv4() + _id;
    const currentUrl = `${process.env.MAIN_SERVER}/user/verify/${ _id }/${ uniqueString }/ `;


    //mailing mailOptions

    const mailOptions = {
        from: `"PU Projections⭐"${ process.env.EMAIL_USER }`,
        to: email,
        bcc: email,
        subject: "PU Projections 2022 , Email Verification ✔ ",
        // text: `Registration Confirmation Mail `,
        html: `<p>Verify Your email to complete the registration.</p>
        <p>This link <b>expires in 6 hours</b></p>
        <p>Press this link <a href=${ currentUrl }>Click here</a>to verify.</p>  `,
    };
    // hashing unique value 
    const saltBounds = 10;
    bcrypt.hash( uniqueString, saltBounds )
        .then( ( hashedUniqueString ) => {
            const newVerification = new UserVerification( {
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now() + 21600000,
            } );

            newVerification
                .save()
                .then( () => {
                    transporter.sendMail( mailOptions, function ( error, message ) {
                        if ( error ) {
                            console.log( error )
                            res.json( {
                                status: "FAILED",
                                message: "Email Verification Failed!"
                            } );
                        } else {
                            res.json( {
                                status: "PENDING",
                                message: "Verification Email Sent !"
                            } );
                        }
                    } );
                } )
                .catch( ( error ) => {
                    res.json( {
                        status: "FAILED",
                        message: "Can't save verification email data!"
                    } );
                } )
        } ).catch( ( error ) => {
            res.json( {
                status: "FAILED",
                message: "An Error occurred hashing mail!"
            } );
        } )

};

//Verify email
router.get( "/verify/:_id/:uniqueString/", async ( req, res ) => {
    let { _id, uniqueString } = req.params;
    const userId = _id;
    const result = await UserVerification.findOne( { userId } )
    if ( result ) {
        if ( result ) {
            // User verification record exists and we can proceed 
            const { expiresAt } = result;
            // const hashedUniqueString = result[0].uniqueString;
            if ( expiresAt < Date.now() ) {
                //Record expired we can delete it 
                const deletedUser = await UserVerification.deleteOne( { userId } );
                // .then( ( result ) => {
                if ( deletedUser ) {
                    User.deleteOne( { _id: userId } )
                        .then( () => {
                            let message = "Link has expired please signup again";
                            res.redirect( `/user/verified/error=true&message=${ message }` );
                        } )
                        .catch( ( error ) => {
                            console.log( error );
                            let message = 'Clearing with expire  uinque string failed';
                            res.redirect( `/user/verified/error=true&message=${ message }` );
                        }
                        )
                } else {
                    let message = 'An error occurred whileclearing verification record';
                    res.redirect( `/user/verified/error=true&message=${ message }` );
                }
                // } )
                // .catch( ( error ) => {
                //     console.log( error );
                //     let message = 'An error occurred whileclearing verification record';
                //     res.redirect( `/user/verified/error=true&message=${ message }` );
                // } );
            } else {
                // VAlid  record exists 
                //First compare and hash string
                // bcrypt.compare( uniqueString, hashedUniqueString )
                //     .then( ( result ) => {
                //         if ( result ) {
                //Strings Exists and match 
                User.updateOne( { _id: userId }, { verified: true } )
                    .then( () => {
                        UserVerification.deleteOne( { _id: userId } )
                            .then( () => {
                                res.sendFile( path.join( __dirname, './../views/verifyemail.html' ) );
                            } )
                            .catch( ( error ) => {
                                console.log( error );
                                let message = 'An eror occured while deleting record from user Verification';
                                res.redirect( `/user/verified/error=true&message=${ message }` );
                            } )
                    } )
                    .catch( ( error ) => {
                        let message = 'An eror occured while updating record';
                        res.redirect( `/user/verified/error=true&message=${ message }` );
                    } )

                //     } else {
                //         // existing record but verification failed 
                //         let message = 'Invalid record please the inbox and try again.';
                //         res.redirect( `/user/verified/error=true&message=${ message }` );
                //     }
                // } )
                // .catch( ( error ) => {
                //     let message = 'Error while compare unique strings';
                //     res.redirect( `/user/verified/error=true&message=${ message }` );
                // } )
            }
        } else {
            let message = "Accound Record does not exists or has already verified. Please Signup or Login";
            res.redirect( `/user/verified/error=true&message=${ message }` );
        }
    }
    else {
        console.log( error );
        let message = 'An error occurred while checking existing record';
        res.redirect( `/user/verified/error=true&message=${ message }` )
    }
} );

router.get( "/verified", ( req, res ) => {
    res.sendFile( path.join( __dirname, "./../views/verifyemail.html" ) );
} );



// student Login ----------------------

router.post( "/login", ( req, res ) => {

    let { email, password } = req.body;

    email = email.trim();
    password = password.trim();

    if ( email == "" || password == " " ) {
        res.json( {
            status: "FAILED",
            message: "Fill all fields !"
        } );
    } else {
        //Create login process 

        User.find( { email } )
            .then( ( data ) => {
                if ( data.length ) {
                    //User Exists
                    // check if user is verifies 

                    if ( !data[0].verified ) {
                        res.json( {
                            status: "FAILED",
                            message: "User not verified,Check your inbox  !"
                        } );
                    } else {
                        const hashedPassword = data[0].password;
                        bcrypt.compare( password, hashedPassword )
                            .then( result => {
                                if ( result ) {
                                    res.json( {
                                        status: "SUCCESS",
                                        message: "Login SUCCESS !"
                                    } );
                                } else {
                                    res.json( {
                                        status: "FAILED",
                                        message: "Invalid Password !"
                                    } );
                                }
                            } )
                            .catch( ( error ) => {

                                res.json( {
                                    status: "FAILED",
                                    message: "Error Comparing Password!"
                                } );
                            } );
                    }
                } else {
                    res.json( {
                        status: "FAILED",
                        message: "Invalid Credentials !"
                    } );
                }
            } )
            .catch( error => {
                res.json( {
                    status: "FAILED",
                    message: "User error!"
                } );
            } )
    }


} );


module.exports = router;