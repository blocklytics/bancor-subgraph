import { BigInt } from "@graphprotocol/graph-ts"
import {
  AddressUpdate,
  OwnerUpdate as ContractRegistryOwnerUpdate
} from "../generated/ContractRegistry/ContractRegistry"
import { 
  NewConverter 
} from "../generated/ConverterFactory/ConverterFactory"
import {
  TokenAddition,
  TokenRemoval,
  ConverterAddition,
  ConverterRemoval,
  OwnerUpdate as ConverterRegistryOwnerUpdate
} from "../generated/templates/ConverterRegistry/ConverterRegistry"
import {
  Conversion,
  ConversionFeeUpdate,
  ManagerUpdate,
  OwnerUpdate as ConverterOwnerUpdate
} from "../generated/templates/Converter/Converter"
import {
  NewSmartToken,
  Issuance,
  Destruction,
  Transfer,
  Approval,
  OwnerUpdate as SmartTokenOwnerUpdate
} from "../generated/templates/SmartToken/SmartToken"
import { Converter } from "../generated/templates"
import { ConverterContract } from "../generated/schema"

// Contract Registry events
export function handleAddressUpdate(event: AddressUpdate): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  // let entity = ExampleEntity.load(event.transaction.from.toHex())

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  // if (entity == null) {
  //   entity = new ExampleEntity(event.transaction.from.toHex())

  //   // Entity fields can be set using simple assignments
  //   entity.count = BigInt.fromI32(0)
  // }

  // // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)

  // // Entity fields can be set based on event parameters
  // entity._contractName = event.params._contractName
  // entity._contractAddress = event.params._contractAddress

  // // Entities can be written to the store with `.save()`
  // entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.getAddress(...)
  // - contract.contractNames(...)
  // - contract.itemCount(...)
  // - contract.owner(...)
  // - contract.addressOf(...)
  // - contract.newOwner(...)
}

export function handleContractRegistryOwnerUpdate(event: ContractRegistryOwnerUpdate): void {}

// Converter Factory events
export function handleNewConverter(event: NewConverter): void {
  Converter.create(event.params._converter)
}

// Converter Registry events
export function handleTokenAddition(event: TokenAddition): void {}

export function handleTokenRemoval(event: TokenRemoval): void {}

export function handleConverterAddition(event: ConverterAddition): void {}

export function handleConverterRemoval(event: ConverterRemoval): void {}

export function handleConverterRegistryOwnerUpdate(event: ConverterRegistryOwnerUpdate): void {}


// Converter events
export function handleConversion(event: Conversion): void {}

export function handleConversionFeeUpdate(event: ConversionFeeUpdate): void {}

export function handleManagerUpdate(event: ManagerUpdate): void {}

export function handleConverterOwnerUpdate(event: ConverterOwnerUpdate): void {}



// Smart Token events
export function handleNewSmartToken(event: NewSmartToken): void {}

export function handleIssuance(event: Issuance): void {}

export function handleDestruction(event: Destruction): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

export function handleSmartTokenOwnerUpdate(event: SmartTokenOwnerUpdate): void {}
