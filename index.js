const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log(process.env.STRIPE_SECRET_KEY, process.env.ACCESS_TOKEN_SECRET, 'stripe');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://assignment-12-46c15.web.app',
    'https://fluffy-tapioca-04c919.netlify.app',
  ],


}));
// app.use(cors());
app.use(express.json());


console.log(process.env.DB_USERNAME);


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSS}@cluster0.kgkkymv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSS}@cluster0.kgkkymv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// console.log(uri);
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

    await client.connect();
    console.log("db connected")
    const usersCollection = client.db('taskDB').collection('user');
    const itemsCollection = client.db('taskDB').collection('items');
    const paymentCollection = client.db("taskDB").collection("payments");
    const submissionCollection = client.db("taskDB").collection("submissions");
    const notificationCollection = client.db("taskDB").collection("notifications");
    const withdrawalCollections = client.db("taskDB").collection("withdrawals");
    // app.get('/notifications', async (req, res) => {
    //   // const decodeemail=req.decoded.email;
    //   // console.log('inside post',decodeemail);
    //   const result = await notificationCollection.find().toArray();
    //   res.send(result);
    // })
    app.get('/notifications', async (req, res) => {
      // const decodeemail=req.decoded.email;
      // console.log('inside post',decodeemail);
      const result = await notificationCollection.find().toArray();
      res.send(result);
    })
    app.get('/items', async (req, res) => {
      // const decodeemail=req.decoded.email;
      // console.log('inside post',decodeemail);
      const result = await itemsCollection.find().toArray();
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/items', async (req, res) => {
      const newitem = req.body;

      // Insert new item
      const result = await itemsCollection.insertOne(newitem);
      console.log(result);
      res.send(result);
    });
    app.post('/notifications', async (req, res) => {
      const newnotification = req.body;

      // Insert new item
      const result = await notificationCollection.insertOne(newnotification);
      console.log(result);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.delete('/items/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await itemsCollection.deleteOne(query);
      res.send(result);
    });

       // / payment
    //  payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.get('/payments', async (req, res) => {
      // const query = { email: req.params.email }
      // if (req.params.email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' });
      // }
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      // const query = {
      //   _id: {
      //     $in: payment.cartIds.map(id => new ObjectId(id))
      //   }
      // };

      // const deleteResult = await cartCollection.deleteMany(query);

      res.send(paymentResult);
    });

    app.post('/submissions', async (req, res) => {
      const newSubmission = req.body;

      // Create a new submission
      const result = await submissionCollection.insertOne(newSubmission);
      const insertedId = result.insertedId;
      res.send(result)

    });

    app.post('/users', async (req, res) => {
      const newuserbody = req.body;
      const { newuserinfo, email, coinNeeded, coins, task_completion } = newuserbody;
      console.log(newuserbody);
      try {
        // Check if user exists
        const existingUser = await usersCollection.findOne({ email });
        // console.log(existingUser.userCoin);
        if (!existingUser) {
          const result1 = await usersCollection.insertOne(newuserinfo);
          return res.send(result1);
          // return res.status(404).json({ message: 'User not found' });
        }
        // Check if insertion was successful
        let newUserCoin = parseInt(existingUser.userCoin);

        if (coinNeeded) {
          newUserCoin -= coinNeeded;
        }
        if (coins) {
          newUserCoin += coins;
        }
        let newTaskCompletion = parseInt(existingUser.task_completion);

        console.log(typeof newTaskCompletion, typeof task_completion);
        // let taskcompletion=1;
        if (coins && task_completion) {
          newUserCoin += coins;

          newTaskCompletion = newTaskCompletion + task_completion;

        }
        console.log(newTaskCompletion);
        console.log(newUserCoin);
        console.log('dont go');

        // Update usercoin in the database
        const result = await usersCollection.updateOne(
          { email },
          {
            $set:
            {
              userCoin: newUserCoin,
              task_completion: newTaskCompletion,
            }

          }
        );

        if (result.modifiedCount === 1) {
          res.json({ message: 'Usercoin updated successfully' });
        }
        else {
          res.status(500).json({ message: 'Failed to update usercoin' });
        }
      } catch (error) {
        console.error('Error updating usercoin:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    


   

   

    app.get('/items/:_id', async (req, res) => {
      const { _id } = req.params;

      try {
        const item = await itemsCollection.findOne({ _id: ObjectId(_id) });

        if (!item) {
          return res.status(404).json({ message: 'Item not found' });
        }

        res.json(item);
      } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.put('/items/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateditem = req.body;

      const item = {
        $set: {
          title: updateditem.title,
          Task_details: updateditem.Task_details,
          submission_info: updateditem.submission_info,
        }

      }
      const result = await itemsCollection.updateOne(filter, item, options);
      res.send(result);
    });

   



 

   
   


   
   

    app.patch('/items/:id', async (req, res) => {
      const { id } = req.params;
      const { task_quantity } = req.body;

      try {
        const parsedQuantity = parseInt(task_quantity, 10);
        console.log(typeof task_quantity);
        if (isNaN(parsedQuantity)) {
          return res.status(400).json({ message: 'Invalid task quantity' });
        }
        const item = await itemsCollection.findOne({ _id: new ObjectId(id) });

        if (!item) {
          return res.status(404).json({ message: 'Item not found' });
        }

        // Decrement task_quantity in your application logic
        const updatedQuantity = item.task_quantity - 1;

        // Update the document with the new task_quantity
        const result = await itemsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { task_quantity: updatedQuantity } }
        );
        console.log(result);
        if (result.modifiedCount > 0) {
          res.json({ message: 'Task quantity updated successfully', modifiedCount: result.modifiedCount });
        } else {
          res.status(500).json({ message: 'Failed to update task quantity' });
        }
      } catch (error) {
        console.error('Error updating task quantity:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });
    app.get('/submissions', async (req, res) => {
      const result = await submissionCollection.find().toArray();
      res.send(result);
    });
    app.put('/submissions/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id, 'idvv');
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateditem = req.body;

      const item = {
        $set: {
          status: updateditem.status,

        }

      }
      const result = await submissionCollection.updateOne(filter, item, options);
      res.send(result);
    });

    app.put('/users/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id, 'idvv');
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateduser = req.body;

      const item = {
        $set: {
          role: updateduser.role,

        }

      }
      const result = await usersCollection.updateOne(filter, item, options);
      res.send(result);
    });
    // withdraw
    app.post('/withdrawals', async (req, res) => {
      const newwithdraw = req.body;

      // Insert new submission
      const result = await withdrawalCollections.insertOne(newwithdraw);
      console.log(result);
      res.send(result);
    });

    app.get('/withdrawals', async (req, res) => {
      const result = await withdrawalCollections.find().toArray();
      res.send(result);
    });

    app.delete('/withdrawals/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await withdrawalCollections.deleteOne(query);
      res.send(result);
    });
    

    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// // app.post('/users', async (req, res) => {
//     const newuser = req.body;
//     console.log(newuser);
//     const result = await usersCollection.insertOne(newuser);


  const result = await usersCollection.find().toArray();






app.get('/', (req, res) => {
  res.send('assignment-12 server   is running')
})

app.listen(port, () => {
  console.log(`assignment-12 is running on port: ${port}`)
})

// git init
// git add README.md
// git commit -m "first commit"
// git branch -M main
// git remote add origin https://github.com/Mujibmarziya/assignment-12-server-site.git
// git push -u origin main