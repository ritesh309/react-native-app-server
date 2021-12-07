const mongoose = require( 'mongoose' );
const jwt = require( "jsonwebtoken" );


//Creating the DB Schema

const contactSchema = new mongoose.Schema( {

    date: { type: Number, default: ( new Date() ).getDate() },
    month: { type: Number, default: ( new Date() ).getMonth() },
    year: { type: Number, default: ( new Date() ).getFullYear() },

    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    email: {
        type: String,
        required: [true, "Enter Your E-mail"],

    },
    city: { type: String },
    state: { type: String },
    zip: { type: Number },
    message: {
        type: String
    }
    // tokens: [{
    //     token: {
    //         type: String,
    //         timestamps: true

    //     }
    // }]
} );


// generating  authentication token

// contactSchema.methods.generateAuthToken = async function () {
//     try {
//         token = jwt.sign( { _id: this._id }, process.env.SECRET_KEY_CONTACT );
//         this.tokens = this.tokens.concat( { token: token } );
//         await this.save();
//         return token;
//     } catch ( error ) {
//         console.log( error );
//     }
// }

const contactData = mongoose.model( 'CONTACTS', contactSchema );

module.exports = contactData;