export class BinaryConverter {
    fromHexValue(value: string): string | null {
        let result: string = "";
        const lookupTable: {
            [index: string | number]: string;
        } = {
            "0": "0000",
            "1": "0001",
            "2": "0010",
            "3": "0011",
            "4": "0100",
            "5": "0101",
            "6": "0110",
            "7": "0111",
            "8": "1000",
            "9": "1001",
            a: "1010",
            b: "1011",
            c: "1100",
            d: "1101",
            e: "1110",
            f: "1111",
        };

        for (let i: number = 0; i < value.length; i++) {
            if (lookupTable[value[i]]) {
                result += lookupTable[value[i]];
            } else {
                return null;
            }
        }
        return result;
    }
}

export class HexaConverter {
    fromByteArray(byteArray: number[]): string {
        return Array.from(byteArray, (byte) => {
            return ("0" + (byte & 0xff).toString(16)).slice(-2);
        }).join("");
    }
}
