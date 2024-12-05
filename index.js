import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient, ServerApiVersion } from 'mongodb'

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


    app.get('/menu', async (req , res)=>{

        const cursor = menuCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    app.get('/reviews', async (req , res)=>{

        const cursor = reviewsCollection.find()
        const result = await cursor.toArray()
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










app.get('/',(req , res)=>{
    res.send("Bistro Server is running...")
})
app.listen(port,()=>{
    console.log("Bistro server is running on port",port);
    
})
