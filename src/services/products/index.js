const express = require("express");
const path = require("path");
const uniqid = require("uniqid");
const { readDB, writeDB } = require("../../lib/utilities");
const multer = require("multer");
const { writeFile } = require("fs-extra");
const { join } = require("path");
const { check, validationResult } = require("express-validator");
const { begin } = require("xmlbuilder");
const axios = require("axios");
const router = express.Router();
const upload = multer({});

const productsFilePath = path.join(__dirname, "products.json");
const reviewsFilePath = path.join(__dirname, "../reviews/reviews.json");
const productsFolderPath = join(__dirname, "../../../public/img/products");

router.post("/:id/upload", upload.single("product"), async (req, res, next) => {
  try {
    await writeFile(
      join(productsFolderPath, req.file.originalname),
      req.file.buffer
    );
    res.send("ok");
  } catch (error) {
    console.log(error);
    next(error);
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    const productsDB = await readDB(productsFilePath);
    const product = productsDB.filter(
      (product) => product.ID === req.params.id
    );
    if (product.length > 0) {
      res.send(product);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
router.post("/sumTwoPrices", async (req, res, next) => {
  try {
    const { productOneID, productTwoID } = req.body;
    const productsDB = await readDB(productsFilePath);

    if (!productOneID || !productTwoID) {
      res.send({ message: "the body should contain 2 IDs" });
    } else {
      let toSum = productsDB.map((a) => a.price);
    }
    console.log(tosum);
    console.log(product);
    /*grab 2 price using IDs from products.json then construct xml body then send xml body to API => 
    convert repsonse to JSON => send it back */
    const xml = begin({ version: "1.0", encoding: "utf-8" })
      .ele("soap:Envelope", {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
        "xmlns:soap": "http://schemas.xmlsoap.org/soap/envelope/",
      })
      .ele("soap:Body")
      .ele("Add", { xmlns: "http://tempuri.org/" })
      .ele("intA")
      .text(5)
      .up()
      .ele("intB")
      .text(7)
      .end();
    // use http://www.dneonline.com/calculator.asmx?op=Add
    const { data } = await axios.post(
      "http://www.dneonline.com/calculator.asmx?op=Add",
      xml,
      {
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );

    // convert data (xml) to json
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
});
router.get("/:id/reviews", async (req, res, next) => {
  try {
    console.log(req.params.id);
    const productsDB = await readDB(productsFilePath);
    const product = productsDB.filter(
      (product) => product.ID === req.params.id
    );
    const reviews = await readDB(reviewsFilePath);
    const filteredReviews = reviews.filter(
      (r) => r.elementId === req.params.id
    );
    if (filteredReviews.length > 0) {
      res.send({ ...product, filteredReviews });
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const productsDB = await readDB(productsFilePath);
    if (req.query && req.query.name) {
      const filteredproducts = productsDB.filter(
        (product) =>
          product.hasOwnProperty("name") &&
          product.name.toLowerCase() === req.query.name.toLowerCase()
      );
      res.send(filteredproducts);
    } else {
      res.send(productsDB);
    }
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    check("name")
      .isLength({ min: 4 })
      .withMessage("Name too short!")
      .exists()
      .withMessage("Insert a name please!"),
  ],
  [
    check("description")
      .isLength({ min: 4 })
      .withMessage("Description too short!")
      .exists()
      .withMessage("Insert description please!"),
  ],
  [check("brand").exists().withMessage("Insert brand please!")],
  [check("price").exists().withMessage("Insert price please!")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const productsDB = await readDB(productsFilePath);
        const newproduct = {
          ...req.body,
          ID: uniqid(),
          createdAt: new Date(),
        };

        productsDB.push(newproduct);

        await writeDB(productsFilePath, productsDB);

        res.status(201).send({ id: newproduct.ID });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", async (req, res, next) => {
  try {
    const productsDB = await readDB(productsFilePath);
    const newDb = productsDB.filter((product) => product.ID !== req.params.id);
    await writeDB(productsFilePath, newDb);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const productsDB = await readDB(productsFilePath);
    const newDb = productsDB.filter((product) => product.ID !== req.params.id);

    const modifiedproduct = {
      ...req.body,
      ID: req.params.id,
      updatedAt: new Date(),
    };

    newDb.push(modifiedproduct);
    await writeDB(productsFilePath, newDb);

    res.send({ id: modifiedproduct.ID });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
