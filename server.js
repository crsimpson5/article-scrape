const express = require("express");
const exphbs = require("express-handlebars");
const cheerio = require("cheerio");
const axios = require("axios");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 8080;

const db = require("./models");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Display home page with articles
app.get("/", (req, res) => {
  db.Article.find({}).sort({ dateAdded: -1 }).limit(10)
    .then(dbArticles => {
      res.render("index", { articles: dbArticles });
    })
    .catch(err => {
      console.log(err.message);
      res.send(err);
    });
});

// Display single article with comments
app.get("/articles/:id", (req, res) => {
  db.Article.findOne({ _id: req.params.id })
    .populate({ path: "comments", options: { sort: { dateAdded: 1 } } })
    .then(dbArticle => {
      res.render("singleArticle", dbArticle);
    })
    .catch(err => {
      console.log(err.message);
      res.send("404");
    });
});

// Create comment
app.post("/articles/:id", (req, res) => {
  db.Comment.create(req.body)
    .then(dbComment => {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { comments: dbComment._id } }, { new: true });
    })
    .then(dbArticle => {
      res.json(dbArticle);
    })
    .catch(err => {
      res.send(err);
    });
});

// Delete comment
app.delete("/comment/:id", (req, res) => {
  db.Article.update({}, { $pull: { comments: req.params.id } })
    .then(dbArticle => {
      db.Comment.deleteOne({ _id: req.params.id })
        .then(dbComment => {
          res.json(dbComment);
        })
        .catch(err => {
          res.send(err);
        });
    })
    .catch(err => {
      res.send(err);
    });

});

// Scrape articles
app.get("/scrape", (req, res) => {
  axios.get("https://www.thescoreesports.com/home").then(results => {
    const $ = cheerio.load(results.data);

    $("[class*='NewsCard__container']").each((i, element) => {
      const headline = $(element).find("[class*='NewsCard__title']").text();
      const summary = $(element).find("[class*='NewsCard__content']").text();
      const url = "https://www.thescoreesports.com" + $(element).find("a").attr("href");
      const imgUrl = $(element).find("[class*='NewsCard__featureImage']").find("img").attr("src");

      db.Article.create({ headline, summary, url, imgUrl })
        .then(dbArticle => {
          console.log(dbArticle);
          res.send("articles scraped");
        })
        .catch(err => {
          console.log(err.message);
          res.send("error");
        });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on: http://localhost:${PORT}`);
});
