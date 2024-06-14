const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.awkga2v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    // jwt related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    // verify token - middleware
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify Admin - middleware
    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // Admin apis
    app.get(
      "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }

        const query = { email: email };
        const user = await userCollection.findOne(query);
        const admin = false;
        if (user) {
          (admin === user?.role) === "admin";
        }
        res.send({ admin });
      }
    );

    // User CRUD

    // get all users
    app.get("/users", verifyToken, async (req, res) => {
      // console.log("inside /users get ", req.headers.authorization); // get token from client
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
    app.put("/users/:id", verifyToken, async (req, res) => {
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
      const filter = { ...newUser, role: "student" };
      const isUserExist = await userCollection.findOne({
        email: newUser.email,
      });
      if (isUserExist?._id) {
        return res.send({
          status: "success",
          message: "Login successful",
        });
      }
      const result = await userCollection.insertOne(filter);
      res.send(result);
    });

    // delete a single user from database - DELETE
    app.delete("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      // console.log("please delete user id: ", id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //
    app.patch("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //
    app.patch("/users/student/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "student",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // ===========================================
    //   Courses apis
    // ===========================================

    // get all Courses
    // app.get("/courses", async (req, res) => {
    //   const result = await courseCollection.find().toArray();
    //   res.send(result);
    // });

    // get a single course - GET
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const course = await courseCollection.findOne(query);
      res.send(course);
    });

    // update a single course - PUT/PATCH
    app.patch("/courses/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      // console.log(updatedData)
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const result = await courseCollection.updateOne(
        filter,
        { $set: updatedData },
        option
      );
      res.send(result);
    });

    // create/add a new course to database - POST
    app.post("/courses", async (req, res) => {
      const newCourse = req.body;
      const result = await courseCollection.insertOne(newCourse);
      res.send(result);
    });

    // delete a single course from database - DELETE
    app.delete("/courses/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      // console.log("please delete product id: ", id);
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    });

    // ================================================================
    // ============ Add product to cart ================
    app.get(`/courses`, verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = email ? { email: email } : {};
      const result = await courseCollection.find(query).toArray();
      res.send(result);
    });

    app.delete(`/courses/:id`, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    });

    // ================================================================

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
