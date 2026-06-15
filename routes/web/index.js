const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.render("pages/login", { page: "login" }));

router.get("/dashboard", (req, res) =>
  res.render("pages/dashboard", { page: "dashboard" }));
router.get("/transaction", (req, res) =>
  res.render("pages/transactions", { page: "transaction" }));
router.get("/transfer", (req, res) =>
  res.render("pages/transfer", { page: "transfer" }));
router.get("/history", (req, res) =>
  res.render("pages/history", { page: "history" }));
router.get("/beneficiaries", (req, res) =>
  res.render("pages/beneficiaries", { page: "beneficiaries" }));
router.get("/profile", (req, res) =>
  res.render("pages/profile", { page: "profile" }));
router.get("/admin", (req, res) =>
  res.render("pages/admin", { page: "admin" }));

module.exports = router;
