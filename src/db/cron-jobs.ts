import cron from "node-cron";

// job to run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    // add your logic here
    // For example, you might want to update a column in your database
  } catch (error) {
    console.error("Error updating isActive column:", error);
  }
});
