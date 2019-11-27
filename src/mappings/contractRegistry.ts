import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddressUpdate,
  OwnerUpdate as ContractRegistryOwnerUpdate
} from "../../generated/ContractRegistryContract/ContractRegistryContract"
import {
    BancorContract,
    ConverterRegistry,
    ContractRegistry
  } from "../../generated/schema"

  // Contract Registry events
export function handleAddressUpdate(event: AddressUpdate): void {
    let contractRegistryEntity = new ContractRegistry(event.address.toHex());
    let contractName = event.params._contractName.toString();
    let contractAddress = event.params._contractAddress.toHex();
    log.debug("Contract registry address updated at block# {}: {} is now at {}", [event.block.number.toString(), contractName, contractAddress]);
    if(contractName == "BancorConverterRegistry") {
      let converterRegistries = contractRegistryEntity.converterRegistries || [];
      let converterRegistryEntity = ConverterRegistry.load(contractAddress)
      if (converterRegistryEntity == null) {
        converterRegistryEntity = new ConverterRegistry(contractAddress);
      }
      converterRegistries.push(event.params._contractAddress.toHex());
      contractRegistryEntity.converterRegistries = converterRegistries;
      converterRegistryEntity.save();
      contractRegistryEntity.save();
    }
    let bancorContractEntity = new BancorContract(contractAddress);
    bancorContractEntity.name = contractName;
    bancorContractEntity.registry = event.address.toHex();
    bancorContractEntity.save();
  }
  
  export function handleContractRegistryOwnerUpdate(event: ContractRegistryOwnerUpdate): void {
    let contractRegistryEntity = new ContractRegistry(event.address.toHex());
    contractRegistryEntity.owner = event.params._newOwner.toHex();
    contractRegistryEntity.save();
  }