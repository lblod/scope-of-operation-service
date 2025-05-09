
import { app, query, errorHandler } from 'mu';
app.get("/", function (req, res) {
  res.send("Hello from scope-of-operation-service!");
});


app.use(errorHandler);
