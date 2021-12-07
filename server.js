const dotenv = require( 'dotenv' );
dotenv.config( { path: './config.env' } )
const cors = require( 'cors' )
const express = require( 'express' );
const cookieParser = require( 'cookie-parser' );

const app = express();
app.use( cors() );
app.use( cookieParser() );
app.use( express.json() );


// app.use( require( "./router/auth.js" ) );
const UserRouter = require( "./api/User")


//Define the sever PORT
const PORT = process.env.PORT || 4000

//DB connection 
require( './db/connDB' )
//Global Checking for server connection
// localhost:4000/
app.get( '/', ( req, res ) => {
    res.send( "PU Projections Backend Server " )
} )
// Calling API ROUTES
app.use('/user',UserRouter);

//Listeing PORT
app.listen( PORT, () => {
    console.log( `Server is running ..PORT ${ PORT }` )
} )