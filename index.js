const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.awkga2v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userDB = client.db("UserDB");
    const userCollection = userDB.collection("userCollection");
    const courseDB = client.db("courseDB");
    const courseCollection = courseDB.collection("courseCollection");

// User CRUD

    // get all users
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get a single user - GET
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // update a single user - PUT/PATCH
    app.put("/users/:id",  async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      // console.log(updatedData);
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const result = await userCollection.updateOne(
        filter,
        { $set: updatedData },
        option
      );
      res.send(result);
    });

    // create a new user to database - POST
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      // console.log(token);
      const filter = {...newUser, "role": "student"}
      const isUserExist = await userCollection.findOne({email: newUser.email});
      if (isUserExist?._id) {
        return res.send({
          status: 'success',
          message: 'Login successful',
          
        });
      }
       const result = await userCollection.insertOne(filter);
      res.send(result);
    });

    // delete a single user from database - DELETE
    app.delete("/users/:id",  async (req, res) => {
      const id = req.params.id;
      // console.log("please delete user id: ", id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to DREAM'S LMS server");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
