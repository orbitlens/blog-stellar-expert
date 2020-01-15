---
title: New Validators – Our Small Contribution to the Network
description: Announcement of new high-quality full validators supported by StellarExpert.
date: 2020-01-14
image: validators-connection.jpg 
---

The 2019 year has been undoubtfully inspiring for Stellar Network as the number
of total accounts and daily operations continued the trend of the previous years,
growing by more than 50%. 

However, this was an even more spectacular year in
terms of decentralization. When the Stellar mainnet was deployed, most of
the validators depended on the SDF quorum set, delegating voting power to SDF.
Now it is a fully decentralized network. Node operators run autonomous tier 1
quorum sets (which essentially means a redundant validator set with at least
3 nodes in it) intersecting one another, which made the protocol voting process
completely independent. This year organizations building on Stellar put a huge
amount of time and effort into the network security, deploying new nodes.
As a result, now the network has 5 times more tier-one validators than a year
ago. And it keeps growing.

![Awesome validators visualization from stellarbeat.io](stellar-quorum-intersection-stellabeat.jpg)

I'm thrilled to announce that we launched two more full validators in addition
to the node we've been running beforehand, so now we operate a
fault-tolerant 3-member quorum set of high-quality validators with open history
archives. That's our small contribution to the decentralization and resilience
of the network.

Here are the details of our validators:

```
[[VALIDATORS]]
HOST="validator1.stellar.expert:11625"
PUBLIC_KEY="GDQ75AS5VSH3ZHZI3P4TAVAOOSNHN346KXJOPZVQMMS27KNCC5TOQEXP"
HISTORY="http://history.validator1.stellar.expert"

[[VALIDATORS]]
HOST="validator2.stellar.expert:11625"
PUBLIC_KEY="GCR64G344LXYVUD7523XGMMM2OEB4E6SPLIBHXNME5P6QYWAUF2QUTO3"
HISTORY="http://history.validator2.stellar.expert"

[[VALIDATORS]]
HOST="validator3.stellar.expert:11625"
PUBLIC_KEY="GA23K4HUQMGXC46BGOSWY4AGRBB6ZWEOIF6N2ZUXS3X5A6FOMQPMIPEG"
HISTORY="http://history.validator3.stellar.expert"
```

Feel free to add our servers to your quorum set. 
We run nodes on a permanent basis and promise to maintain them, ensuring high
availability of our services.

To utilize a fail-over quorum set, use the following config:

```
[QUORUM_SET.se]
THRESHOLD_PERCENT=66
VALIDATORS=[
    "GDQ75AS5VSH3ZHZI3P4TAVAOOSNHN346KXJOPZVQMMS27KNCC5TOQEXP",
    "GCR64G344LXYVUD7523XGMMM2OEB4E6SPLIBHXNME5P6QYWAUF2QUTO3",
    "GA23K4HUQMGXC46BGOSWY4AGRBB6ZWEOIF6N2ZUXS3X5A6FOMQPMIPEG",
]
```

P.S. Special thanks to amazing @pieterjan84, the author of the brilliant quorum
explorer [stellarbeat.io](https://stellarbeat.io/quorum-monitor/GDQ75AS5VSH3ZHZI3P4TAVAOOSNHN346KXJOPZVQMMS27KNCC5TOQEXP?center=1).
This wonderful tool makes the process of network inspection and quorum set 
configuration really enjoyable.

*Photo credits: [Mario Purisic](https://unsplash.com/@mariopurisic) at Unsplash*