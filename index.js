import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'

dotenv.config()
const port = process.env.PORT || 5000

const app = express()

app.use(express.json())
app.use(cors())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@express-mongo-curd.khcti.mongodb.net/?retryWrites=true&w=majority&appName=express-mongo-curd`;

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

    const menuCollection = client.db("Bistro_DB").collection("menu")
    const reviewsCollection = client.db('Bistro_DB').collection('reviews')
    const cartsCollection = client.db('Bistro_DB').collection('carts')
    const usersCollection = client.db('Bistro_DB').collection('users')


    //jwt related api

    app.post('/jwt', async(req ,res) =>{
      const userInfo = req.body
      
      
      const token = jwt.sign({
        data: userInfo
      }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({token})
    })


    const varifyToken = (req , res , next) =>{
      
      if(!req.headers.authorization){
        
        return res.status(401).send({message:"unauthorized access"})
      }

      const token = req.headers.authorization.split(" ")[1]

      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
          if(error){
            return res.status(401).send({message:"unauthorized access"})
          }
          req.decoded = decoded
          
          next()
      })
      
     
      
    }

    const varifyAdmin = async (req , res ,next) =>{
      const query = {email: req.decoded.data.email}
      const user = await usersCollection.findOne(query);
      
      
      let isAdmin = false
      if(user && user.role === "admin"){
        isAdmin = true
      }

      
      
      if(!isAdmin){
        return res.status(403).send({message:"forbidden access"})
      }
      
      next()
    }


    //user related api

    app.post('/users', async (req, res) => {
      const userData = req.body;
      
      

      const query = {email:userData.email}
      const isExistUser = await usersCollection.findOne(query)

      if(isExistUser){
        return res.send({message:"user already exist",insertedId:null})
      }
      const result = await usersCollection.insertOne(userData);
      res.send(result)
    })
    app.get('/users',varifyToken,varifyAdmin, async (req, res) => {
  

    if(req.decoded.data.email !== req.query.email ){
      return res.status(403).send({message:"unauthorized access"})
    }
    
     
      const cursor = usersCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/users/admin",varifyToken,async(req , res) =>{
      if(req.decoded.data.email !== req.query.email ){
        return res.status(403).send({message:"unauthorized access"})
      }

      const query = {email: req.query.email}
      const user = await usersCollection.findOne(query);

      let isAdmin = false
      if(user && user.role === "admin"){
        isAdmin = true
      }

      res.send({admin:isAdmin})

    })


    app.delete('/users/:id',varifyToken,varifyAdmin, async (req, res) => {
      const id = req.params.id
      
      console.log("from api",id);
      
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      
      res.send(result)
    })
    app.patch('/users/make-admin/:id',varifyToken,varifyAdmin, async (req, res) => {
      const id = req.params.id
      console.log(id);
      
      const filter = {_id: new ObjectId(id)}

      const updatedDoc = {
        $set:{
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter,updatedDoc)
      
      res.send(result)
    })




    //public api
    app.get('/menu', async (req, res) => {

      const cursor = menuCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/reviews', async (req, res) => {

      const cursor = reviewsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result)
    })
    app.get('/carts', async (req, res) => {
      const email = req.query?.email;
      
      
      const query = {email:email}
      const cursor = cartsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      
      
      const query = {_id: new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query)
      
      res.send(result)
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
  res.send("Bistro Server is running...")
})
app.listen(port, () => {
  console.log("Bistro server is running on port", port);

})
