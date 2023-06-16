const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require ('express');
const app = express();
require('dotenv').config();
var jwt = require('jsonwebtoken');
const cors = require('cors');
const stripe = require('stripe')(process.env.payment_secret_key)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// verify jwt
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
      return res.status(401).send({error: true, message:'unauthorized access'})
    }
    // baerer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.access_token_secret, (err, decoded) => {
      if(err){
        return res.status(401).send({error: true, message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
  }



const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASS}@cluster0.sflyv9x.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
const userCollection = client.db("yogaDb").collection('users');
const classCollection = client.db('yogaDb').collection('classes');
const selectedClassCollection = client.db('yogaDb').collection('selectedClasses');
const paymentCollection = client.db('yogaDb').collection('payments');

// jwt token
app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.access_token_secret, { expiresIn: '1h'})
    res.send({token});
})
// verify admin
const verifyAdmin = async (req, res, next) =>{
    const email = req.decoded.email;
    const query = {email: email}
    const user = await userCollection.findOne(query);
    if(user?.role !== 'admin'){
        return res.status(403).send({error : true, message: 'forbidden message'});
    }
    next();
}
// users collection api
app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
})
app.post('/users', async (req, res) => {
    const user = req.body;
    console.log(user);
    const query = { email: user.email}
    const existingUser = await userCollection.findOne(query);
    if(existingUser){
        return res.send({message : 'user already exists'});
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
})
// // admin check
app.get('/users/admin/:email', verifyJWT, async(req, res) => {
    const email = req.params.email;
    if(req.decoded.email !== email){
       return res.send({admin: false})
    }
    const query = {email: email}
    const user = await userCollection.findOne(query);
    const result = { admin: user?.role === 'admin'};
    res.send(result);
})
app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)};
    const updateDoc = { 
        $set: {
            role: 'admin'
        },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
})
// instructor check
app.get('/users/instructor/:email', verifyJWT, async(req, res) => {
    const email = req.params.email;
    if(req.decoded.email !== email){
        return res.send({instructor: false});
    }
    const query = {email: email}
    const user = await userCollection.findOne(query);
    const result = { instructor: user?.role === 'instructor'};
    return res.send(result);

})
// popular instructor 
app.get('/popularInstructors', async (req, res) =>{
    const query = { role: 'instructor'};
    const result = await userCollection.find(query).limit(6).toArray();
    res.send(result);
})
app.get('/instructors', async(req, res) => {
   const query = { role: 'instructor'}
   const result = await userCollection.find(query).toArray();
   res.send(result);
    
})
app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)};
    const updateDoc = { 
        $set: {
            role: 'instructor',
        },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
})
// class api
app.patch('/classes/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)};
    const updateDoc = {
        $set: {
            status: 'approve',
        }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
})
// status deny
app.patch('/class/:id', async (req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updateDoc ={
        $set: {
            status: 'deny'
        }
    }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
})
// manage classes api
app.get('/classes',verifyJWT, async(req, res) => {
    const result = await classCollection.find().toArray();
    res.send(result);
})
// approve class api for class page
app.get('/classes/approve', async (req, res) => {
    const query = { status: 'approve' }
    const result = await classCollection.find(query).toArray();
    res.send(result);
})
// popular classes
app.get('/popularClasses', async(req, res) =>{
    const query = {status : 'approve'};
    const result = await classCollection.find(query).limit(6).toArray();
    res.send(result);
})
app.post('/classes', verifyJWT, async (req, res) => {
    const newClass = req.body;
    console.log(newClass);
    const result = await classCollection.insertOne(newClass);
    res.send(result);
})
// // user selected class
app.get('/selectedClasses/:email', async (req, res) =>{
    const result = await selectedClassCollection.find({email : req.params.email}).toArray();
    res.send(result);
})
app.get('/selectedClasses', async (req, res) => {
    const email = req.query.email;
    if(!email){
        return res.send([]);
    }
    const decodedEmail = req.decoded.email;
    if(email !== decodedEmail){
        return res.status(403).send({error : true, message: 'forbidden access'})
    }
    const query = { email: email}
    const result = await selectedClassCollection.find(query).toArray();
    res.send(result);
})
app.get('/selectedClass/:id', async(req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id)};
    const result = await selectedClassCollection.findOne(query);
    console.log(result);
    res.send(result)
})
app.post('/selectedClasses', async (req, res) => {
    const selectedClass = req.body;
    console.log(selectedClass);
    const updateDoc= {
        $set : {
            paymentStatus: false
        }
    }
    const result = await selectedClassCollection.insertOne(selectedClass,updateDoc);
    res.send(result); 
})
app.delete('/selectedClasses/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id)};
    const result = await selectedClassCollection.deleteOne(query);
    res.send(result);
})
app.get('/myClasses/:email', async (req, res) => {
    const result = await classCollection.find({email: req.params.email}).toArray();
    res.send(result);
})
// create payment intent
app.post('/create-payment-intent',verifyJWT, async(req, res) =>{
    const {price} = req.body;
    const amount = parseInt(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency : 'usd',
        payment_method_types: ['card']
    })
    res.send({
        clientSecret : paymentIntent.client_secret
    })
})
// payment api
app.post('/payments',verifyJWT, async(req, res) => {
    const payment = req.body;
    const insertResult = await paymentCollection.insertOne(payment);
    
    res.send(insertResult);
})
// enrolled class api
app.get('/payments/:email', verifyJWT, async(req, res) =>{
    const email = req.params.email;
    const filter = {email: email};
    const query = {paymentStatus: 'true'};
    const result = await paymentCollection.find(filter, query).toArray();
    res.send(result);
})




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("treaty yoga is running");
})

app.listen(port, () => {
    console.log(`Treaty yoga and meditation in running on PORT: ${port}`);
})