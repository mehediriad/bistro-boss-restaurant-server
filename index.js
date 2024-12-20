import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
import Stripe from 'stripe';




dotenv.config()
const port = process.env.PORT || 5000

const app = express()

app.use(express.json())
app.use(cors())

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



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
    // await client.connect();

    const menuCollection = client.db("Bistro_DB").collection("menu")
    const reviewsCollection = client.db('Bistro_DB').collection('reviews')
    const cartsCollection = client.db('Bistro_DB').collection('carts')
    const usersCollection = client.db('Bistro_DB').collection('users')
    const paymentCollection = client.db('Bistro_DB').collection('payments')


    //jwt related api

    app.post('/jwt', async (req, res) => {
      const userInfo = req.body


      const token = jwt.sign({
        data: userInfo
      }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({ token })
    })


    const varifyToken = (req, res, next) => {

      if (!req.headers.authorization) {

        return res.status(401).send({ message: "unauthorized access" })
      }

      const token = req.headers.authorization.split(" ")[1]

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded

        next()
      })



    }

    const varifyAdmin = async (req, res, next) => {
      const query = { email: req.decoded.data.email }
      const user = await usersCollection.findOne(query);


      let isAdmin = false
      if (user && user.role === "admin") {
        isAdmin = true
      }



      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }

      next()
    }


    //user related api

    app.post('/users', async (req, res) => {
      const userData = req.body;



      const query = { email: userData.email }
      const isExistUser = await usersCollection.findOne(query)

      if (isExistUser) {
        return res.send({ message: "user already exist", insertedId: null })
      }
      const result = await usersCollection.insertOne(userData);
      res.send(result)
    })
    app.get('/users', varifyToken, varifyAdmin, async (req, res) => {


      if (req.decoded.data.email !== req.query.email) {
        return res.status(403).send({ message: "unauthorized access" })
      }


      const cursor = usersCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/users/admin", varifyToken, async (req, res) => {
      if (req.decoded.data.email !== req.query.email) {
        return res.status(403).send({ message: "unauthorized access" })
      }

      const query = { email: req.query.email }
      const user = await usersCollection.findOne(query);

      let isAdmin = false
      if (user && user.role === "admin") {
        isAdmin = true
      }

      res.send({ admin: isAdmin })

    })


    app.delete('/users/:id', varifyToken, varifyAdmin, async (req, res) => {
      const id = req.params.id

      console.log("from api", id);

      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)

      res.send(result)
    })
    app.patch('/users/make-admin/:id', varifyToken, varifyAdmin, async (req, res) => {
      const id = req.params.id
      console.log(id);

      const filter = { _id: new ObjectId(id) }

      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)

      res.send(result)
    })




    //public api
    app.get('/menu', async (req, res) => {

      const cursor = menuCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.post('/menu', varifyToken, varifyAdmin, async (req, res) => {
      const menuItem = req.body;


      const result = await menuCollection.insertOne(menuItem)
      res.send(result)
    })
    app.patch('/menu/:id', varifyToken, varifyAdmin, async (req, res) => {
      const menuItem = req.body;

      const query = { _id: new ObjectId(req.params.id) }

      const updatedDoc = {
        $set: {
          name: menuItem.name,
          recipe: menuItem.recipe,
          image: menuItem.image,
          category: menuItem.category,
          price: menuItem.price
        }
      }

      const result = await menuCollection.updateOne(query, updatedDoc)
      res.send(result)
    })
    app.get('/menu/:id', async (req, res) => {
      const menuId = req.params.id;
      const query = { _id: new ObjectId(menuId) }
      const result = await menuCollection.findOne(query)
      console.log(result);
      res.send(result)
    })
    app.delete('/menu/:id', varifyToken, varifyAdmin, async (req, res) => {
      const menuId = req.params.id;

      const query = { _id: new ObjectId(menuId) }
      const result = await menuCollection.deleteOne(query)
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


      const query = { email: email }
      const cursor = cartsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id


      const query = { _id: new ObjectId(id) }
      const result = await cartsCollection.deleteOne(query)

      res.send(result)
    })

    //admin states
    app.get('/admin-states', varifyToken, varifyAdmin, async (req, res) => {

      const users = await usersCollection.estimatedDocumentCount()
      const orders = await paymentCollection.estimatedDocumentCount()
      const menuItems = await menuCollection.estimatedDocumentCount()

      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$amount"
            }
          }
        }
      ]).toArray()

      const revenue = result.length > 0 ? result[0].totalRevenue : 0

      res.send({
        users,
        orders,
        menuItems,
        revenue
      })
    })


    //order states
    app.get("/orders-states", async (req, res) => {
      const result = await paymentCollection.aggregate([
        {
          $unwind: "$menuIds"
        },
        {
          $addFields: {
            menuIds: { $toObjectId: "$menuIds" }
          }
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'menuIds',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $unwind: '$menuItems'
        },
        {
          $group: {
            _id: "$menuItems.category",
            quantity: {$sum:1},
            totalRevenue: {$sum : "$menuItems.price"}
          }
        },
        {
          $project:{
            _id:0,
            category: "$_id",
            quantity: "$quantity",
            revenue: "$totalRevenue"
          }
        }

      ]).toArray()
      res.send(result)
    })

    //PAYMENT INTENT
    app.post("/payment-history", varifyToken, async (req, res) => {
      const payment = req.body.paymentDetails;


      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const paymentResult = await paymentCollection.insertOne(payment)
      const deleteResult = await cartsCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult })
    })


    app.get("/payment-history", varifyToken, async (req, res) => {


      const query = { email: req.query.email }

      const cursor = paymentCollection.find(query)
      const result = await cursor.toArray()

      res.send(result)

    })

    app.post("/create-payment-intent", varifyToken, async (req, res) => {
      const { price } = req.body

      const amount = parseInt(price) * 100



      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"]
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
