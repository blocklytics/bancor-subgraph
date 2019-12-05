import { BigInt, log } from "@graphprotocol/graph-ts"
import {
    NewSmartToken,
    Issuance,
    Destruction,
    Transfer,
    Approval,
    OwnerUpdate as SmartTokenOwnerUpdate
  } from "../../generated/templates/SmartTokenContract/SmartTokenContract"
import {
    Token
  } from "../../generated/schema"

// Smart Token events
// export function handleNewSmartToken(event: NewSmartToken): void {
//     // let smartToken = new SmartToken(event.address.toHex());
//     // let contract = SmartTokenContract.bind(event.address);
//     // smartToken.targetTokenName = contract.name();
//     // smartToken.targetTokenSymbol = contract.symbol();
//     // smartToken.targetTokenDecimals = contract.decimals();
//     // smartToken.save()
// }

// export function handleIssuance(event: Issuance): void {}

// export function handleDestruction(event: Destruction): void {}

// export function handleTransfer(event: Transfer): void {}

// export function handleApproval(event: Approval): void {}

export function handleSmartTokenOwnerUpdate(event: SmartTokenOwnerUpdate): void {
  let smartTokenEntity = new Token(event.address.toHex());
  smartTokenEntity.owner = event.params._newOwner.toHex();
  smartTokenEntity.save();
}