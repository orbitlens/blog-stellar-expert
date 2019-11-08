---
title: Tiny Things Matter or Detective Novel Featuring Stellar DEX
description: The story about one small error in the Stellar DEX matching engine which could lead to the market panic and tradings halt.
date: 2018-12-20
image: clash.jpg
---

> TL;DR More than half a year ago I discovered a vulnerability in Stellar DEX that allowed an attacker to buy micro-amounts of any asset at the 1:1 rate. With basic automation, potential attack profitability was up to 16,000 XLM per hour. The bug was fixed in Stellar Core v10, all funds are safe.  
> After public report disclosure on HackerOne, I received a couple of questions regarding the vulnerability. So I decided to write a post summing up the details of this story.

Bankers are always quite watchful on all aspects concerning numbers rounding during money transfers. That’s the case when tiny things matter, especially when the financial institution processes millions of transactions daily.

This is the story about one small error in the [Stellar](https://stellar.org) Decentralized Exchange matching engine which could lead to the market panic and tradings halt.

## Chapter 1. Traces

![](traces.jpg)

About nine months ago I was working on improvements in [StellarExpert](https://stellar.expert) trades aggregation when I spotted a strange thing. Charts displayed occasional price spikes for some trading pairs, sometimes more than 1000%. My first thought was that those markets lack liquidity, which is a common issue for new assets. However, the same spikes were detected for top assets with tight orderbook. Weird, very-very weird…

When I dug through the database and checked the trading effects, I found that those price deviations were caused by "dust" trades with an extra-small trading amount, like 0.0000001 XLM. So I decided that was just a Horizon rounding error on the effect serialization step because the operations displayed prices close to the current market price and it happened only with extra-small amounts. Therefore all I need to normalize the price history chart was to exclude trades with the amount less than, say, 0.0000100 XLM from the aggregation pipeline.

## Chapter 2. Suspicions

![](suspicions.jpg)

Next day I was fiddling with the minimum amount threshold for the trades to be included in the history stats when suddenly I discovered a pattern. "Dust" trades caused trades execution 1:1 despite the assets been trading and the original order price. Summing up accounts balances in the database showed that the trades actually happened at the 1:1 rate. Such behavior resulted in especially impressive OHLC price charts for BTC-anchored assets (NaoBTC, Papaya, VCBear). Fluctuations looked monstrous; candles showed **~99.995%** sudden price drops from the regular market price.

That was a bug – moreover, a bug in Stellar Core. So I sat and started composing a bug report for the SDF team. It looked like the rounding has been initially implemented in such fashion to prevent the market from bloating with such "dust leftover" offers.

## Chapter 3. Threat

![](threat.jpg)

The issue didn’t look critical as anybody who was going to exploit that bug had to pay at least 0.0000100 XLM of transaction fees. Nobody sanely will spend 0.00001 XLM for fees to trade 0.0000001 CNY with a slightly better exchange rate. Even without fees, the earnings won’t cover the time needed to implement the automated exploit.

Then it struck me. What about more expensive assets? For example, assets anchored to BTC at that moment were trading around **37,000 XLM/BTC**. One could bought **0.0000001 BTC** for **0.0000101 XLM** (0.0000100 XLM base fee + 0.0000001 XLM actually spent), or 0.27% of the market price! The best Bitcoin deal ever!

So far 0.0000001 BTC looks not so impressive, let’s see how we can   
increase the potential attacker profit. After thinking for half an hour, I came with the following attack vector.  
\- Create 20 accounts and fund with, say, 120 XLM each.  
\- Implement a bot that submits a transaction with 100 ManageOffer operations for each account every 4 seconds (roughly 900\*100 =90,000 operations per hour for each account).  
\- Rent cheap cloud server for ten dollars per month and launch the bot.  
\- Once in 10 minutes or so bot should sell all traded BTC at market price and send all profits to a master account.  
\- Repeat while there is at least one open offer. Then switch to another asset (BTC issued by another anchor, or, for example, ETH tokens).

The profitability of the attack:   
_(0.0037–0.0000101) \* 20 \* 90000 = **6641.82 XLM/hour**_

About **1,300 USD per hour** considering  the price at the moment of bug discovery. Not so bad, huh? On top of that, regular traders lose the corresponding amount of money minus fees every hour. Using 50 channel accounts instead of 20 could increase the profit of the potential attack up to 16,000 XLM per hour.

The worst thing of all is that the attack could last days even if the malicious activity is detected. You can’t just block an account on the public permissionless blockchain without a consensus of all validators, neither you can "turn off" trades on the decentralized exchange.

## Chapter 4. Scrutiny

![](scrutiny.jpg)

Once I made the calculations, it came to me that it can be a huge problem if someone with evil intentions discovers the vulnerability. Such an unstoppable attack on SDEX, the core Stellar mechanism, could lead to the massive FUD wave, not only halting on-chain trades but also resulting in panic XLM sales.

To tell the truth, I was so confused by my findings, that I composed and sent an email directly to Jed. I didn’t create an issue in the bug-tracker to prevent public disclosure. Only much later, I recollected that someone mentioned a dedicated email address for urgent security questions and bug bounty on Stellar Slack. A few minutes digging through the history, and here it is – [security@stellar.org](mailto:security@stellar.org).

The auto-responder said that   
"You are receiving this message because Stellar.org uses HackerOne to receive security vulnerability reports. Before Stellar.org can review your vulnerability report, you must complete your submission on HackerOne."

Thus I registered on HackerOne and [submitted a report](https://hackerone.com/reports/330105) containing all vulnerability details and attack vector. Bartek commented that they are investigating the report, and Jed earlier responded that they were working on a fix for that. SDF team knew about the problem, so I relaxed and forgot about it.

_However, it wasn’t the end of the story…_

## Chapter 5. Pursuit

![](pursuit.jpg)

_Every decent detective novel requires at least one pursuit scene. You won’t be disappointed._

A few months later I was working out at the gym when suddenly I received the notification from Stellar Slack. It immediately caught my attention.

[@fritz](https://twitter.com/ekwogefee) asked about strange trading activity which resulted in price chart spikes on [interstellar.exchange](https://interstellar.exchange/). Price spikes? That sounded too familiar to me. A cursory investigation confirmed my suspicions. Someone was exploiting the bug, buying anchored BTC for 1/3 and 1/12 of the market price! And it was not just an accident – there were dozens of such operations in each ledger.

First of all, I reached @fritz and asked him to remove the messages from the public channel. Immediately after that I tried to contact Bartek, Jed, and Nicolas. First via Slack, then using an email. It was Sunday, so nobody was online, yet I desperately needed to let them know about the problem. Luckily, Zac answered me, so I explained him the case in a few words, and he promised to pass the information directly to Stellar Core developers.

I was sitting on a bench right in the middle of the gym trying to detach my attention from the surrounding noises and investigate suspicious operations. Maybe an error in a bot script? Not likely, as all offers were identical, and there were [hundreds](https://horizon.stellar.org/trades?cursor=84982168538882049-87&counter_asset_type=credit_alphanum4&base_asset_type=native&counter_asset_issuer=GATEMHCCKCY67ZUCKTROYN24ZYT5GK4EQZ65JJLDHKHRUZI3EUEKMTCH&counter_asset_code=BTC&base_asset_code=XLM&order=desc&limit=100) (if not thousands) of them. An exploit? But why buy BTC at only 1/3 of the market price when one could trade at 1/30,000 and use up to 50 channel accounts to maximize profits? Perhaps to disguise the activity?

The next two days I monitored the ledger. Apparently, two more accounts were exploiting the same trick. MANAGE\_OFFER operations were tightly packed – up to 100 operations per transaction. Was it spreading?

Too many questions but one thing was clear enough. Now it was just a matter of time when someone else would spot the trades and come to the same сonclusions. Two rival bots competing with each other could completely flood the ledger with such micro trades, resulting not only in the market panic but also in the network congestion.

## Chapter 6. Clash

![](clash.jpg)

In the meantime, SDF developers confirmed that the bug was fixed in the [Stellar Core v10](https://github.com/stellar/stellar-core/releases/tag/v10.0.0) which has been already deployed on the testnet. The public network upgrade was scheduled in a few weeks. Clearly, it had to be rolled out as soon as possible.

Of course, there were other possibilities to prevent an attack without the upgrade. For example, an immediate base fee increase would make a possible exploit much less profitable although it would result in service disruption as base fee amount is hardcoded in most SDKs. Validators potentially could agree to ban the suspicious accounts. However, the community would consider such actions as centralized governance.

Therefore, SDF urged all validators to install a fresh Stellar Core release. No one was particularly thrilled to upgrade the nodes hastily according to the sudden schedule change. Plus the update process itself wasn’t smooth in some cases. Nevertheless, in ten days validators voted for the protocol upgrade to version 10. The orders flooding stopped almost immediately.

Currently, all accounts spotted in abusing the vulnerability are deleted (merged into other accounts).

## The End

![](end.jpg)

After public report disclosure on HackerOne, I received a couple of questions regarding the vulnerability. So I decided to write a post summing up the details of this story.

Despite a thorough investigation, I still can’t say for sure whether we witnessed a preparation phase of the upcoming extensive attack or it was merely a side-effect of some other market manipulation, perhaps orderbook flooding. Nevertheless, the vulnerability was eliminated.

Stellar offers a fancy interface abstraction; wallets and exchange interfaces built on to top of it hide the low-level ledger complexity from us. It’s easy to forget about the validators running the network (and they do it for free, as there is no concept of mining in Stellar), as well as SDF which is maintaining the codebase of the vitally important services, applications, and SDKs. So next time you’ll open a wallet to transfer some lumens or trade on SDEX, think of all those companies and individuals working together to sustain and protect the ledger. And if you happened to be a software developer, bear in mind that **_tiny things matter_**.