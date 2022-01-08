const assignTftRoutes = (app) => {
  // Endpoints
  app.get("/api/tfters", (_req, res) => {
    res.status(400).send({
      message: "Unsupported",
    });
  });

  // Add more tfters to the list
  app.post("/api/tfter", (_req, res) => {
    res.status(400).send({
      message: "Unsupported",
    });
  });

  // Remove tfters from the list
  app.delete("/api/tfters", (_req, res) => {
    res.status(400).send({
      message: "Unsupported",
    });
  });
};

export default assignTftRoutes;
