---
layout: default
title: Books
permalink: /books/
---

<main id="main" data-src="{{ '/data/books.json' | relative_url }}">
  <section class="container" style="padding:28px 0;">
    <h1>বই</h1>
    <p>বিভাগভিত্তিক পেজ — নিচে কার্ড লোড হবে</p>
  </section>

  <section id="cardsArea" class="cards-area container" style="padding-bottom:40px;"></section>
  <div id="spinner" class="spinner center" hidden>লোড হচ্ছে...</div>
  <div id="endMessage" class="end-message center" hidden>আর কিছু নেই</div>
  <div id="sentinel" style="height:2px"></div>
</main>
