---
title: Stellar AMMs – at Crossroads Between Triumph and Disaster
description: Comparison of CAP37 and CAP38 approaches to building liquidity pools on Stellar
date: 2021-05-06
image: amm-crossroads.jpg
---

My [previous blog post](./automated-market-makers-and-liquidity-pools-on-stellar-network)
about AMMs and liquidity pools on Stellar network has been published two months
ago, so it's time to follow up on that undoubtedly crucial subject. Despite
seemingly slow progress, a lot of people have been participating in low-level
technical discussions and researching different approaches. As a result, we now
have not one, but two Core advancement
proposals ([CAP37](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0037.md)
and [CAP38](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0038.md))
with diametrically opposed concepts.

Both proposals have pros and cons, yet the most important thing is not how they
will impact the network right after the protocol upgrade, but rather future
implications. This choice is very significant as the wrong evolution vector may
drive the network effectively unusable sooner than anyone can imagine. I'll try
to break down this point by point so people without a deep background in Stellar
internals and ledger balance mechanics could also follow my points.

### Open Protocol Meeting Evaluation

First of all, the proposal drafts reached some level of maturity, and finally,
the topic has been brought to the protocol meeting for the evaluation. I must
admit, watching the discussion [recording](https://youtu.be/EKUbj811XsU) caught
me off-guard. From the first minutes, it occurred to me that not everyone in the
committee have really read through the CAP37 draft as the very first question
about the difference in reserve requirements between CAP37 and CAP38 made no
sence. In reality, the approaches are identical – `LiquidityStakeEntry` (CAP37)
or a pool trustline (CAP38) ensures that a pool can't exist without at least one
base reserve unit locking, while the pool itself doesn't belong to any account
and doesn't consume reserves. After the words about the lack of substantial
benefits of the interleaved execution and the Communism/Capitalism analogy, the
complete meaninglessness of all debates in the working group and mailing list
became obvious to me as they were entirely overlooked by decision-makers.

Two key Core developers advocated for the CAP38 approach from the beginning, and
after two months of consultations the arguments remain essentially the same. Of
course, it's a bit sad for me as the author of the alternative proposal. Yet I
would gladly throw away all my work and join the CAP38 camp just for the sake of
bringing crucial AMMs functionality to Stellar... if only it wouldn't be so
terrible in the long run.

### Multi-Pool World by Example

So what's wrong with CAP38? It's awesome by itself – well-designed and
meticulously written. However, the consequences of having multiple independent
pools for the same trading pair with independent trading execution would be
disastrous, and it's not an exaggeration. If you followed the discussion on
Youtube, the consensus currently is to have multiple pools (presumably with
different trading fees and maybe different pool types/parameters) alongside the
existing DEX orderbook for the same asset pair. Let's simulate several
real-world scenarios for this situation and try to understand how the system
behaves.

Suppose we have:

- USDC/XLM trading pair
- 10K USDC + 20K XLM in the orderbook
- 30K USDC + 60K XLM in the constant product pool with a 0.3% fee
- 15K USDC + 30K XLM in the constant product pool with a 1% fee
- 5K USDC + 10K XLM in some other pool type with different price curve, let's
  say, SimpleSwap

_Case 1._ Someone wants to purchase a 35K USD-worth product (
e.g. a rare NFT toke) paying from the XLM stash while a seller accepts USDC
only. Well, it's impossible. The payment will fail since you can only trade
against any single pool/orderbook, but not several of them. Either the payment
processor takes the volatility risk providing the over-the-counter exchange
services for a client, or the payment is declined.  
Exaggerated edge case, you say? No, that's a very real story from CoinQuest.

_Case 2._ Let's reduce the settlement amount to 10K USDC. Now we can use the
first pool from our list to execute the trade (woohoo!). But what exchange price
we'll actually get? We'll have to pay 30090 XLM, so the average exchange price
will be 0.33234 USDC/XLM (huge slippage compared to the original 0.5 USDC/XLM
exchange ratio). With CAP37 it would be about ≈0.39 USDC/XLM if we are talking
about trading against pools only, and even better if the orderbook is liquid.
5000 XLM (16%) is a significant difference.

_Case 3._ But hey, we aren't stupid, right? We can split this payment into 4
parts and execute 4 trade operations one by one: buy 5K USDC from the first
pool, 2K USDC from the second, 1K USDC from the third, and exchange the rest on
the orderbook. Obviously, if we don't have the payment atomicity requirement (
which is a must in the payment processor example), it's not a big deal. Slightly
annoying and more time-consuming, but not so problematic, right? Not exactly.

As soon as you submit the first swap transaction to buy 5K USDC from the first
pool, strange things will start happening. The next swap operation hangs for
some time (anywhere between 20 to 200 seconds), and then will either fail (if
you specified the exact limit you want to receive), or you'll get a worse
exchange price than you expected. And by the way, congrats! You just froze
payments/trades for all other Stellar users for the same period of time. Sounds
implausible? No need to search for a crystal ball – extrapolating the current
market participants' behavior will do the trick.

As soon as the first payment is executed, arbitrage bots that continuously
monitor the ledger, will spot the arbitrage opportunity and start competing for
the free money. Indeed, the equilibrium price on the first pool becomes 0.34705
USDC/XLM after the trade which means that the bot owner can make about 800 XLM
in a matter of seconds by arbitraging payments between three pools and the
orerbook using a fully autonomous algorithm. Presumably, the bonus may be
considerably higher given that the orderbook has liquidity and low slippage.
I'll cover the arbitrage problem in details further. For now, you need to
understand that any significant trade under such conditions will inevitably
result in surge pricing.

_Case 4._ If a user wants to provide liquidity, which pool should it be? Oh,
can't deposit liquidity here as that's an obsoleted pool (new protocol version
added some new param and all existing pools became deprecated, people can only
withdraw from here). Another one looks cool and recommended in the popular
Reddit post, but there's almost no liquidity in it now, is it still relevant?
How to choose between pools with different fees? Is it essential?

Terrible usage experience, lower returns, endless support requests from users.
Ethereum usually serves as a reference point. Yes, the endless diversity of
Ethereum-based projects is cool by itself, although it's so complicated for
normal people, they prefer to steer away from that complexity. Therefore, the
key question here is whether we want to build a versatile toolkit for developers
and geeks, or maybe we should target the mass market, lowering the overall
complexity by reducing the number of options and spawning new pool types only
when it's absolutely necessary?

### Closer Look at the Arbitrage Problem

Since several bots compete for the same prize, the only viable strategy here is
to submit a huge number of simultaneous transactions with crunked-up transaction
fees in an attempt to maximize chances that our arbitrage transaction is
included in the next ledger while transactions from other bots get stuck in the
mempool.

How many transactions? With current settings Stellar can process up to 1000
operations per ledger, so that's the minimal number of operations a bot needs to
submit. All of these transactions will fail except the one lucky enough to
execute two circular path payments between the first pool and two others,
winning the prize. Bot developers will compete with each other building more
elaborate algorithms, but for all other users, it means that their low-fee
transactions will have to wait in the line until all high-fee transactions are
executed.

How big those fees may be? It depends solely on the arbitrage opportunity
amount. In the above example, paying 750 XLM in fees is still worth it as the
bot earns the remaining 50XLM out of thin air. I doubt that we'll ever reach
Ethereum's infamous 100$ per transaction, nonetheless, fees as high as 10$ quite
easily fit the narrative.

But wait, that's not all of it. Other automated services have to adapt to those
fee spikes. For example, market makers tracking external prices of the anchored
tokens need to update the DEX offers in a timely manner, otherwise, the delayed
price update may introduce an external arbitrage opportunity resulting in
immediate losses. As a result, they will also automatically increase transaction
fees in an attempt to execute order price readjustments as soon as possible. The
same goes for other automated services.

For an average user, it means that the minimum accepted transaction fee will
sporadically surge to the sky and then gradually decline back to the mean within
several minutes. Basically, it's the same behavior we all witnessed in the past,
but definitely more dangerous as the premium from new arbitrage opportunities
may be way higher than circular cross-pair arbitrage trades that plagued Stellar
mainnet for quite some time. Simply put, any volatility on external markets (
stocks, forex, crypto, etc.) or even a single large funds swap has a potential
induce the 100% ledger congestion with skyrocketing fees, effectively barring
regular users from making payments or trading on Stellar for hours. Of course,
unless they are ready to compete with bots and pay enormous fees, which kind of
defeats the whole idea of Stellar as a global payment/remittance network.

### Fundamental Misconceptions

To address arguments against CAP37 that have been circling around for quite some
time (and emerged again in the recent video discussion), let's analyse several
of them.

#### "Orderbooks and liquidity pools occupy different niches"

Market-makers use an orderbook to peg anchored asset prices to an external feed,
maintaining positions with minimal spread. They will probably use liquidity
pools as well as a part of the strategy, but I doubt that, say, DSTOQ will ever
switch stocks trading to the liquidity pools. Also, orderbook performs much
better for stablecoin/stablecoin asset pairs than a constant-product AMM. From
the user perspective, trading solely on the liquidity pool has a lot of
drawbacks, as shown above. Relatively large swaps result in enormous slippage.
At some point, trade is impossible at all.

But does it mean that proposed AMMs will work only on extremely volatile,
low-liquid market pairs? Not at all! Regular users will be happy to deposit
liquidity and gain interests on their long-term crypto holdings and fiat-backed
assets. No need to artificially segregate orderbooks and liquidity pools
claiming that each technology will be used only in specific cases.

#### "Interleaved execution is a premature optimization, and can be done later"

This seems like a reasonable argument at the first glance. But once we introduce
the way to trade directly against the pool, we'll need to maintain backward
compatibility in future releases because of the pre-signed transactions and
client applications that may rely on said logic. And having an ordebrook and
several pools with imbalanced equilibrium prices completely eliminates most of
the proposal benefits, at the same time introducing arbitrage opportunities.
Also, "can be done later" doesn't hint at any specific date. Writing a CAP,
gathering consensus around it, implementing changes in Core, Horizon, and SDKs
takes months, and sometimes even years.

Meanwhile, the opposite approach is fairly straightforward. The interleaved
orderbook+pool execution can be turned off in the future without breaking
anything. So, are we ready to wait a few years for this feature? Or maybe it
worth spending several additional weeks and do it right from the first attempt?

#### Assumptions regarding future pool types

Any discussion with Core developers inevitably drowns in various assumptions
regarding the need to introduce other liquidity pool types in the future, and
have a pool deprecation mechanism to roll out upgrades in a consistent manner.
While these are very important topics related to general system design and
future-proofing, I'd like to point out that nobody knows how exactly they will
work. Of course, multi-token pools with weighted shares (like Balancer) look
tempting but bring a multitude of questions about the automatic creation and
management of such pools which are too complex to solve in Stellar case.
StableSwap invariant is perfect for trading stablecoins, yet we already have DEX
orderbooks for that. Oracle-powered solutions and complex DAO-based AMMs using
reserves to cover impermanent losses are not applicable for arbitrary market
pairs for obvious reasons. Concentrated liquidity approaches (e.g. Uniswap v3)
have too high storage requirements. So in fact, currently there is no other AMM
type that could bring clear benefits over the simplistic constant product
invariant.

Assumptions about possible pool extensions or the introduction of other pool
types in the future look a bit speculative. With high probability, those
potential new AMM architectures will require different implementation
approaches, separate deposit/withdrawal operations, and additional parameters in
ledger entries. It's impossible to predict requirements for yet-to-be-invented
concepts, so designing infrastructure with regard to unknown forthcoming changes
looks impractical. Therefore, it makes sense to avoid excessive future-proofing
of the proposed pool implementation.

#### Problems of interleaved execution across several pools

As shown
[here](https://groups.google.com/g/stellar-dev/c/Ofb2KXwzva0/m/YVBKq-3PDAAJ),
the complexity of trading against several pools grows linearly with the number
of pools. It's not an NP problem, as has been pointed out by skeptics. Of
course, trade execution across a dozen of pools may be expensive in terms of
performance, as well as driving much more significant rounding errors. That's
why I'm personally advocating for reducing the number of pools to the minimum.
Potential downsides of having multiple similar pools were demonstrated earlier.
Nevertheless, a swap against, say, two pools and an orderbook doesn't imply any
additional challenges or performance penalties.

### How CAP37 Addresses Those Problems

- There is always only one pool of the same type for any given asset pair. This
  prevents the pool choice confusion, eliminates the need for any additional
  price quotation algorithms on the client-side, simplifies interaction flows,
  ensures adequate liquidity provisioning, and protects all participants from
  manipulations. Adding new pool types in the future won't require
  groundbreaking changes to existing functionality.
- Fee rates are determined individually for every pool by direct voting during
  the deposit itself. The voting power of the account is proportional to its
  stake. Thanks to this agile and uncomplicated mechanism, liquidity providers
  can easily readjust pool fees on the fly to match ever-changing market
  conditions.
- The orderbook and liquidity pool always remain in a balanced state which means
  there are no arbitrage opportunities between the pool and orderbook. The
  trading engine automatically conducts arbitrage rebalancing on each trade
  under the hood, eliminating the need for external arbitrage actors.
- Users always receive the best possible price as the trade is executed against
  the entire liquidity available for any trading pair.
- Wallet interfaces will have no additional complex parameters. Developers won't
  even need to change the interface, as trading will work out of the box –
  liquidity pools will be available for existing applications immediately after
  the protocol upgrade.
- There are no reasonable use-cases that require trading exclusively on the
  pool. Price manipulation is probably the only applicable example of pool-only
  swaps, so such operations are not available.

As a closing word, here is my take on the proposed approaches in very simple
terms:

[CAP37](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0037.md)

- End-users happy (better prices, lower complexity)
- Majority of developers happy (pool swaps work out of the box, no need to add
  new interfaces)
- Validators happy (fewer trade transactions, fewer arbitrage transactions,
  lower resource utilization)
- Asset issuers happy (liquidity deposited to a single pool)

[CAP38](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0038.md)

- Arbitragers happy (new arbitrage opportunities)
- Market manipulators happy (profitable and low-risk market manipulation tools)
- Some developers happy (wallets or DEX interface with the most advanced quote
  predicting algorithms will have a competitive advantage)

We are at crossroads, and this decision is really important.

*Photo credits: [Javier Allegue Barros](https://unsplash.com/@soymeraki) at
Unsplash*
