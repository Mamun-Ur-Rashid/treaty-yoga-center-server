const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require ('express');
const app = express();
require('dotenv').config();
var jwt = require('jsonwebtoken');
const cors = require('cors');
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
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
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
    await client.connect();
const studentCollection = client.db("yogaDb").collection('students');

// jwt token
app.post('/jwt', (req, res) => {
    const student = req.body;
    const token = jwt.sign(student, process.env.access_token_secret, { expiresIn: '1h'})
    res.send({token});
})
// students collection api
app.get('/students', async (req, res) => {
    const result = await studentCollection.find().toArray();
    res.send(result);
})
app.post('/students', async (req, res) => {
    const student = req.body;
    const query = { email: student.email}
    const existingStudent = await studentCollection.findOne(query);
    if(existingStudent){
        return res.send({message : 'user already exists'});
    }
    const result = await studentCollection.insertOne(student);
    res.send(result);
})
// admin check
app.get('/students/admin/:email', verifyJWT, async(req, res) => {
    const email = req.params.email;
    if(req.decoded.email !== email){
        res.send({admin: false})
    }
    const query = {email: email}
    const student = { admin: student?.role === 'admin'};
    res.send(result);
})
app.patch('/student/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)};
    const updateDoc = { 
        $set: {
            role: 'admin'
        },
    };
    const result = await studentCollection.updateOne(filter, updateDoc);
    res.send(result);
})
app.patch('/student/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)};
    const updateDoc = { 
        $set: {
            role: 'instructor'
        },
    };
    const result = await studentCollection.updateOne(filter, updateDoc);
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