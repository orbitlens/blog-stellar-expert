---
title: Drafting Off-Chain Account Metadata for Stellar Network
description: Stellar is more than just a network of connected nodes with ledger history, and accounts are not just some entries on the ledger, they may represent user wallets, trading accounts, multisig agreements, smart contracts, utility tokens, even property/business ownership.
date: 2019-04-04
image: network.jpg 
---

![Photo by Clint Adair on Unsplash](network.jpg)
<sup>Photo by [Clint Adair](https://unsplash.com/@clintadair) on [Unsplash](https://unsplash.com)</sup>

### Intro. The need for accounts metadata

“Metadata” sounds quite mysterious and certainly obscure. Why do we need it at all? Stellar works quite well as-is, so why should we try to invent this strange conceptual something something?

Well, Stellar is more than just a network of connected nodes with ledger history, and accounts are not just some entries on the ledger, they may represent user wallets, trading accounts, multisig agreements, smart contracts, utility tokens, even property/business ownership. So an account is actually an abstraction of some real-life entity or process (in case of smart contracts).

Applications need the ability to add custom records to the account containing the application-specific metadata. Things like delegated signing and multi-signature notifications protocol require attaching custom information to the account. Moreover, interoperability between different Stellar-based applications lacks a uniform standard for data storage.

This post sums up a few community proposals for defining a unified standard of dealing with account metadata.

#### What about Data Entries?

Stellar has a built-in [Data Entries feature](https://www.stellar.org/developers/guides/concepts/ledger.html#data-entry) that allows attaching arbitrary data to the account. Developers can use it to store any amount of data, so why just not build things on top of it?

To tell the truth, there are more than a few problems. Of course, at this point you probably suspect that something is not right with the existing solution, otherwise this post would be MUCH shorter. So why Data Entry approach is a no go?

*   Data chunks are limited to 128 bytes per chunk: 64 bytes for a key and 64 more for a binary value.
*   It’s expensive for end-users to add the data to the account as each data entry requires locking base reserve (currently 0.5 XLM).
*   Only one data entry can be added per operation, resulting in huge transactions for multi-property updates. Custom serialization format is required if the value doesn’t fit in 128 bytes.
*   Finally, it’s very expensive for validators. Every data manipulation is stored on-chain **forever**. Even if the data entry removed, it’s still there.

You may think that ~128 bytes per operation don’t seem so much to bother. But let’s imagine, say, a game app with 1000 users that updates data entries every minute. It will generate more than 5GB of data on the blockchain during a month. The transactions wrapping those data manipulation will result in another 5GB. And from now and forever every single validator ingesting the whole ledger will process those gigabytes of temporary and long gone data.

Personally, I believe that Data Entries should be deprecated. Jeremy Rubin composed a nice explanation on “data entries vs off-chain data” [here](https://github.com/stellar/stellar-protocol/issues/221#issuecomment-447769638).

![](requirements.png)

### Requirements

Ok, let’s try to gather requirements for a service that could replace Data Entries.

1.  The service should be distributed, censorship-resistant, decentralized, trustless, and survive the network outages.
2.  Availability over HTTP(S) protocol, preferably with HTTP/2 support and traffic compression. Any client (web, mobile, server-side) should be able to fetch the data without third-party libraries, and HTTP is ideal for this role as it is ubiquitous.
3.  It should be able to deal with large amounts of data. The overall size of all metadata records potentially can be huge, maybe even Terabytes. And it will keep growing exponentially alongside with Stellar mainnet.
4.  Free of charge and unrestricted access to the data and inexpensive (preferably free) updates.
5.  Redundant storage policies with guaranteed scalability. Several servers should always keep metadata copies.
6.  Reliable authentication. Only the account signer (signers) should be able to update the data. The information should be cryptographically protected from the tampering. Preferably, the service should use crypto primitives available in Stellar SDK.
7.  Accounts metadata have to be consistent (at least, eventually consistent) across all nodes.
8.  Sustainability to DDOS, replay, MITM, and other attacks.
9.  Common data format, preferably human-readable and with a standard parser. Like JSON, which is well suited for such purpose.

### Approaches

The problem is not new, and community developers have already proposed a dozen of different solutions intended to deal with the situation. Most of them fall under three main categories.

![](rest.png)

#### 1\. REST API endpoint specified in stellar.toml

Anchor `stellar.toml` resolved through the account `home_domain` property (see [SEP-0001](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md)) points to the REST API endpoint to be used for metadata discovery and manipulations. The service itself can be implemented similarly to [SEP-0014](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0014.md). Third-party clients and applications communicate with the service to retrieve and update metadata.

_Pros:_

*   Simple flow: fetch account info from Horizon server → load `stellar.toml` from `home_domain` → resolve metadata using the service API endpoint.
*   Standalone solution, so it’s efficient and fast by design.
*   Does not require any protocol changes.
*   Users can update metadata even if the account has been locked.

_Cons:_

*   It’s not decentralized. The service is a single point of failure, and the availability and performance entirely depend on the anchor.
*   A user won’t be able to change the metadata service without updating the home domain property (which is currently responsible for quite a lot of various services).
*   Data authenticity depends on the `home_domain` owner, so it’s not a trustless solution. However, the authentication can be possibly amended with account signatures (see approach #3).
*   The service stores metadata only for those accounts that selected it as a `home_domain`. Hence, all the information can be lost in case of the service outage or accidental `home_domain` change.

![](dht.png)

#### 2\. Account contains a reference to the DHT content

Account metadata is stored on the distributed hash table and addressed by its hash, which is stored directly in the Stellar account entry on the ledger. Authentication and security enforced on the SCP level; the hash can be updated only by `SET_OPTIONS` operation. Therefore, the account entry itself maintains a “link” to the associated metadata; account state consistency and updates atomicity are guaranteed by the protocol itself.  
There are plenty of more or less mature DHT implementations. In particular, [IPFS](https://ipfs.io/) provides the required level of flexibility, decentralization, and fault-tolerance so the implementation will focus mainly on the data storage redundancy and cluster maintenance.

_Pros:_

*   Authentication on the Stellar protocol level.
*   Consistency automatically enforced by SCP.
*   Mature DHT technologies, battle-tested in multiple applications.

_Cons:_

*   Requires a protocol change.
*   We still have extra data on-chain in the account entry.
*   Since a metadata reference is updated on-chain, it means more transactions and fees for the network.
*   There is no way to update data once the account is locked. Though the same factor may be added to the “Pros” section, as protecting information from modification follows current Data Entries behavior and guarantees consistency for essential data, for example in case of issuer accounts.

There are at list two different proposals defining the way the metadata hash is attached to an account.

#### 2a. Metadata multihash + router

_(Proposed by @MikeFair)_ We extend the account entry with two new fields:

*   `meta` field (64 bytes) in a multihash format contains the hash of the account metadata object, which serves as a universal identifier for the content in a DHT-like network.
*   `router` (also 64 bytes) is a string containing a storage network identifier (it may be domain name, URL, name, etc.)

When an app fetches the data, it addresses the content by its hash using the storage entry point specified in the `router` field.

This proposal is based on the assumption that data entries will be used exclusively by the applications that added those data, and we shouldn’t try to outline SEPs for inter-application interaction, as one or more proprietary metadata standards will eventually become standards de facto.

_Pros:_

*   Multihash format works with any hash algorithm, making the overall design implementation-agnostic.
*   Future-proof, as the hashing algorithm can be changed at any time.
*   Suited for private networks and proprietary applications that can maintain own private metadata storage.

_Cons:_

*   Additional 128 bytes of data stored with the account entry.
*   Inferior interoperability.

#### 2b. Hash reference only

We add a single `meta` field (32 bytes) containing a hash (say, `SHA-512` or `SHA3-256`) of the metadata object. All clients use the same entry point (IPFS cluster) and the same API for data modifications. Using a uniform API and storage policies results in better adoption. Restraining the hashing algorithms and the entry points allows us to include the account metadata support directly to Stellar SDKs.

Such design implies interoperability among various applications based on the high-level SEP standards (delegated signing, wallet metadata, smart contracts extra data, NFTs, etc.)

_Pros:_

*   Greater potential for interoperability comparing to the **2a** approach. All applications interact with the same storage network.
*   Minimum extra data stored on-chain, 32 bytes only.
*   Support on the SDK level makes it easier for ecosystem developers to adopt the new standard.

_Cons:_

*   Switching to another hashing algorithm (far perspective, but still plausible) may require a protocol upgrade.
*   Uniform open metadata storage possibly may not suit the requirements of private/enterprise networks.

![](key.png)

#### 3\. Distributed service that allows metadata mapping by account id

A single-purpose service with REST API interface that allows associating arbitrary metadata in JSON format with a given account id. It may use the same authentication mechanism as Stellar Core (checking signatures of the account signers) and versioning to ensure replay attack prevention. Consistency verification is also similar to the Stellar approach — data validity can be verified by comparing `ed25519`signatures of the content hash.

_Pros:_

*   Does not require any data to be stored on-chain.
*   Executes fully off-chain, so it potentially will be much faster and more scalable.
*   Focused solely on the Stellar metadata and optimized for it.

_Cons:_

*   Due to network lag and the nature of distributed systems, the authentication potentially may become inconsistent with the current account signers, especially in the situation when account signers were changed recently.
*   Requires extra development efforts comparing to the existing DHT solutions (like IPFS). Сonsequently, it will take more time to audit the security and fix potential holes of such a service.

![](pros-cons.png)

### Closing notes

My main takeaway on this analysis is that we need to focus on the solution which will provide a high level of security and consistency without network clogging. And, of course, we need it now; ecosystem developers can’t wait a few years while we are building an ideal service that will cover every aspect of all possible requirements. From that perspective, I’m leaning towards the approach 2b, which seems to me like an optimal solution. The 3rd proposal is more appealing in terms of functionality, but building a reliable implementation may take a lot of time and efforts, so it’s probably not the best choice if we want to have it by the end of the year.

What are your thoughts on the subject? If, by chance, I missed any other perspective solutions, please feel free to share your thoughts and amend the list with your own design.

_Icon credits: Freepik, DinosoftLabs,_ srip, _Smashicons, Payungkead from_ [_www.flaticon.com_](http://www.flaticon.com)