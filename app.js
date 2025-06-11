
import { app, query, errorHandler } from 'mu';
app.get("/", function (_req, res) {
  res.send("Hello from scope-of-operation-service!");
});


app.use(errorHandler);
