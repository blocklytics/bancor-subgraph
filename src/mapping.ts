import { BigInt } from "@graphprotocol/graph-ts"
import {
  AddressUpdate,
  // OwnerUpdate TODO: figure out if necessary.  If so, determine best way to resolve name conflicts
} from "../generated/ContractRegistry/ContractRegistry"
import { 
  NewConverter 
} from "../generated/ConverterFactory/ConverterFactory"
import {
  TokenAddition,
  TokenRemoval,
  ConverterAddition,
  ConverterRemoval,
  // OwnerUpdate
} from "../generated/templates/ConverterRegistry/ConverterRegistry"
import {
  Conversion,
  ConversionFeeUpdate,
  ManagerUpdate,
  // OwnerUpdate
} from "../generated/templates/Converter/Converter"
import {
  NewSmartToken,
  Issuance,
  Destruction,
  Transfer,
  Approval,
  // OwnerUpdate
} from "../generated/templates/SmartToken/SmartToken"
import { Converter } from "../generated/schema"

// Contract Registry events
export function handleAddressUpdate(event: AddressUpdate): void {
}

// export function handleOwnerUpdate(event: OwnerUpdate): void {}

// Converter Factory events
export function handleNewConverter(event: NewConverter): void {
  let converter = new Converter(event.params._converter.toHex());
  converter.save();
}

// Converter Registry events
export function handleTokenAddition(event: TokenAddition): void {}

export function handleTokenRemoval(event: TokenRemoval): void {}

export function handleConverterAddition(event: ConverterAddition): void {}

export function handleConverterRemoval(event: ConverterRemoval): void {}

// export function handleOwnerUpdate(event: OwnerUpdate): void {}


// Converter events
export function handleConversion(event: Conversion): void {}

export function handleConversionFeeUpdate(event: ConversionFeeUpdate): void {}

export function handleManagerUpdate(event: ManagerUpdate): void {}

// export function handleOwnerUpdate(event: OwnerUpdate): void {}


// Smart Token events
export function handleNewSmartToken(event: NewSmartToken): void {}

export function handleIssuance(event: Issuance): void {}

export function handleDestruction(event: Destruction): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

// export function handleOwnerUpdate(event: OwnerUpdate): void {}