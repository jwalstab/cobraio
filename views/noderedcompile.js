var x = new Date();
let hoursDiff = x.getHours() - x.getTimezoneOffset() / 60;
let minutesDiff = (x.getMinutes() - x.getTimezoneOffset()) % 60;
x.setHours(hoursDiff);
x.setMinutes(minutesDiff);
var z = x.getTime();

msg.payload = "OK";


//UNIT1
if (context.global.coilsRead === true &&
    context.global.inputStatusRead === true &&
    context.global.holdingRegistersRead === true &&
    context.global.holdingRegisters2Read === true &&
    context.global.holdingRegisters3Read === true &&
    context.global.inputRegistersRead === true &&
    context.global.inputRegisters2Read === true)
    {
        context.global.coilsRead = false;
        context.global.inputStatusRead = false;
        context.global.holdingRegistersRead = false;
        context.global.holdingRegisters2Read = false;
        context.global.holdingRegisters3Read = false;
        context.global.inputRegistersRead = false;
        context.global.inputRegisters2Read = false;
        
        var finalData = {
            coils: context.global.emptyArray,
            discreteInputs: context.global.inputStatus,
            holdingRegisters: context.global.holdingRegisters,
            holdingRegisters2: context.global.holdingRegisters2,
            holdingRegisters3: context.global.holdingRegisters3,
            inputRegisters: context.global.inputRegisters,
            inputRegisters2: context.global.inputRegisters2,
            time: z,
            status: "Online"
        }
        context.global.dataToSend = finalData;
    }
else
{
    var finalData = {
        coils: context.global.coils,
        discreteInputs: context.global.emptyArray,
        holdingRegisters: context.global.emptyArray,
        holdingRegisters2: context.global.emptyArray,
        holdingRegisters3: context.global.emptyArray,
        inputRegisters: context.global.emptyArray,
        inputRegisters2: context.global.emptyArray,
        time: z,
        status: "Offline"
    }
    context.global.dataToSend = finalData;
}

if (context.global.coilsRead_U2 === true &&
    context.global.inputStatusRead_U2 === true &&
    context.global.holdingRegistersRead_U2 === true &&
    context.global.holdingRegisters2Read_U2 === true &&
    context.global.holdingRegisters3Read_U2 === true &&
    context.global.inputRegistersRead_U2 === true &&
    context.global.inputRegisters2Read_U2 === true)
    {
        context.global.coilsRead_U2 = false;
        context.global.inputStatusRead_U2 = false;
        context.global.holdingRegistersRead_U2 = false;
        context.global.holdingRegisters2Read_U2 = false;
        context.global.holdingRegisters3Read_U2 = false;
        context.global.inputRegistersRead_U2 = false;
        context.global.inputRegisters2Read_U2 = false;
        
        var finalData = {
            coils: context.global.coils_U2,
            discreteInputs: context.global.inputStatus_U2,
            holdingRegisters: context.global.holdingRegisters_U2,
            holdingRegisters2: context.global.holdingRegisters2_U2,
            holdingRegisters3: context.global.holdingRegisters3_U2,
            inputRegisters: context.global.inputRegisters_U2,
            inputRegisters2: context.global.inputRegisters2_U2,
            time: z,
            status: "Online"
        }
        context.global.dataToSend_U2 = finalData;
    }
else
{
    var finalData = {
        coils: context.global.emptyArray,
        discreteInputs: context.global.emptyArray,
        holdingRegisters: context.global.emptyArray,
        holdingRegisters2: context.global.emptyArray,
        holdingRegisters3: context.global.emptyArray,
        inputRegisters: context.global.emptyArray,
        inputRegisters2: context.global.emptyArray,
        time: z,
        status: "Offline"
    }
    context.global.dataToSend_2 = finalData;
}
return msg;