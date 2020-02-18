---
title: StellarTxSignersInspector - Facilitating Multisig Discovery
description: New tool that simplifies signers and weights discovery, providing an optimal signature schema for Stellar transactions and accounts. 
date: 2020-02-17
image: balance.jpg 
---

Back in 2017, I started exploring Stellar basics – this conceptual change of
paradigm amazed and galvanized me into joining this incredible new universe.
In our age, when there are no unmapped territories left on earth, rethinking
the canonical approaches to software architecture and user interaction may
bring a true joy of an explorer filling blank spaces on the globe. I want to
share several open-source modules and libraries we built while working on 
StellarExpert and other our projects. The result of our sleepless nights,
countless iterations, tiny triumphs, and epic fails – some of them quite
expensive in terms of wasted time and efforts. They may substantially simplify
future navigation through that stormy ocean for other developers. 

_This is the first post in the StellarOpenSourceWeek series (yes, we have plenty of materials for at least five more articles, and I promise that you will find quite exciting stuff there)._

Today I'd like to talk about thresholds matching in multisig transactions and
accounts... Wait, don't leave! That won't be extremely boring or super
complicated. We made a [tool](https://github.com/stellar-expert/stellar-tx-signers-inspector)
that automatically discovers required signers&weights and proposes optimal
signature schema for Stellar transactions and accounts.

One of the good old problems with multisig is the complexity of the signed
transaction behavior prediction. Stellar [allows](https://www.stellar.org/developers/guides/concepts/multi-sig.html)
adding multiple signer keys (each with individual weight) to the account,
and specifying discrete 3-tier operation security thresholds.

Moreover, each transaction may contain more than one operation, and each of
them may have a different source account. In practice, this means that sometimes
it's quite complex to estimate whether the particular multisig transaction will
pass or not, turning a seemingly straightforward task into a complicated
analysis. Does it have enough signatures right now? What if Fred signs the
transaction, will it pass? Is Elsa's key eligible for signing? Who else can sign
the transaction? To answer those questions, developers either have to build
intricate verification routines or simply submit a transaction to the network
and hope for the best.

If it's so obscure, maybe let's gather signatures from all possible signers?

Not so fast. If you add a signature from the keypair that is not a signer of
any source account involved, the transaction will fail. So a developer has to
check in advance whether it is applicable. Even if the transaction is signed
only by eligible signers, it still may fail if you have at least one excessive
signature. For instance, you decided to make an escrow payment and invited a
well-known arbitrator to guarantee your 2-of-3 multisig deal. If you and
counterparty sign a transaction – everything is ok, the same goes for cases
you+arbitrator and counterparty+arbitrator. But if you all three sign it,
the Horizon will return `TX_BAD_AUTH_EXTRA` error. And that's the simplest smart
contract I can imagine. Needless to say that multistep transactions involving
many source accounts may become a nightmare for developers. We've been there. 

So here is the [solution](https://github.com/stellar-expert/stellar-tx-signers-inspector)
(at least for those who build apps using javascript).

Step 1. Install the package.

```
npm install -S @stellar-expert/tx-signers-inspector
```

Step 2. Inspect your transaction to build a signature schema for it.

```js
import {inspectTransactionSigners} from '@stellar-expert/tx-signers-inspector'
const schema = await inspectTransactionSigners(tx)
```

Step 3. And now just ask the right question.

- Who can sign this transaction?  
Three signers eligible.

```js
schema.getAllPotentialSigners()
//returns something like ['GA7...K0M', 'GCF...DLP', 'GA0...MMR']
```

- If I don't want to bother all possible signers, whom should I ask to sign it
in the first place?  
One signature from `GA7...K0M` is enough.

```js
schema.discoverSigners()
//returns something like ['GA7...K0M']
```

- If today only Brian, Ann, Don, and William of all our company C-staff are in
the office, who should sign the transaction?  
Only Brian, Ann, and William are eligible signers for this tx.

```js
schema.discoverSigners(['GCF...DLP', 'GA0...MMR', 'GAP...7K7', 'GBP...D71'])
//returns something like ['GCF...DLP', 'GA0...MMR', 'GBP...D71']
```

- If I ask only Ann and William, will it suffice?  
No.

```js
schema.checkFeasibility(['GA0...MMR', 'GBP...D71'])
//returns false
```

- Ok, then I'll have to ask all three of them, right?  
Yes.

```js
schema.checkFeasibility(['GCF...DLP', 'GA0...MMR', 'GBP...D71'])
//returns true
```

- Looks like our CEO is back, do I still need to bother Brian and Ann?  
No, their signatures are not needed now.

```js
schema.checkAuthExtra(['GA7...K0M', 'GCF...DLP', 'GA0...MMR'])
//returns ['GCF...DLP', 'GA0...MMR']
```

- What if I haven't prepared the transaction yet, but want to check if my
payment (operation with medium threshold) from our treasury will pass if I
ask Ann and Biran to sign it?  
Yes.

```js
schema.checkFeasibility('med', ['GCF...DLP', 'GA0...MMR'])
//returns true
```

- Nice! Will I be able to change signers of the treasury account (requires
`set_options` op with high threshold)?  
No, not enough weight.

```js
schema.checkFeasibility('high', ['GCF...DLP', 'GA0...MMR'])
//returns false
```

- What if I want to use my own Horizon server instead of "horizon.stellar.org"?  
No problem, just provide it on step 2.

```js
const schema = await inspectTransactionSigners(tx, 
    {horizon: 'https://horizon-testnet.stellar.org'})
```

- What if one of the accounts involved will be created right in the transaction
I'm trying to analyze?  
Inspector handles such a case.

- I want to analyze the feasibility of my multisig transaction, but one of the
source accounts will have different thresholds in the future.  
You can pass the accounts info directly. In this case, Inspector will use this
description instead of fetching account details from Horizon.

```js
const schema = await inspectTransactionSigners(tx, {accountsInfo: [
    {
      account_id: 'GAU...DOE',
      id: 'GAU...DOE',
      sequence: '2',
      subentry_count: 0,
      signers: [
        {
          type: 'ed25519_public_key',
          key: 'GAU...DOE',
          weight: 1
        }
      ],
      thresholds: {
        low_threshold: 0,
        med_threshold: 0,
        high_threshold: 0
      }
    }
]})
```


---
 
You can find more use-cases and detailed methods description on the project
[page](https://github.com/stellar-expert/stellar-tx-signers-inspector).
It's an open-source project, feel free to use it in your applications, share
your ideas, and contribute if you have inspiration.

Stay tuned for the next post in a series – we have other exciting things to share.

*Photo credits: [Shiva Smyth](https://www.pexels.com/@shiva-smyth-394854) from Pexels*