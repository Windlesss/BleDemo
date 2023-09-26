const app = getApp()

function inArray(arr, key, val) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === val) {
            return i;
        }
    }
    return -1;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
    if (!buffer || buffer.length <=0){
        return "";
    }
    var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr.join('');
}

Page({
    data: {
        devices: [],
        connected: false,
        chs: [],
    },
    openBluetoothAdapter() {
        console.log('打开BluetoothAdapter...');
        wx.openBluetoothAdapter({
            success: (res) => {
                console.log('打开BluetoothAdapter成功...')
                this.startBluetoothDevicesDiscovery()
            },
            fail: (res) => {
                console.log('scan failed', res);
                if (res.errMsg.includes('already opened')) {
                    console.log('扫描失败，重启BluetoothAdapter');
                    this.restartBluetoothAdapter();
                    return;
                }
                if (res.errCode === 10001) {
                    wx.onBluetoothAdapterStateChange(function (res) {
                        console.log('onBluetoothAdapterStateChange', res)
                        if (res.available) {
                            this.startBluetoothDevicesDiscovery()
                        }
                    })
                }
            }
        })
    },
    getBluetoothAdapterState() {
        wx.getBluetoothAdapterState({
            success: (res) => {
                console.log('getBluetoothAdapterState', res)
                if (res.discovering) {
                    this.onBluetoothDeviceFound()
                } else if (res.available) {
                    this.startBluetoothDevicesDiscovery()
                }
            }
        })
    },
    startBluetoothDevicesDiscovery() {
        this._discoveryStarted = true
        wx.startBluetoothDevicesDiscovery({
            allowDuplicatesKey: true,
            success: (res) => {
                console.log('startBluetoothDevicesDiscovery success', res)
                this.onBluetoothDeviceFound()
            },
        })
    },
    stopBluetoothDevicesDiscovery() {
        console.log('停止扫描...')
        wx.stopBluetoothDevicesDiscovery()
    },
    onBluetoothDeviceFound() {
        wx.onBluetoothDeviceFound((res) => {
            res.devices.forEach(device => {
                if (!device.name && !device.localName) {
                    return
                }
                const foundDevices = this.data.devices
                const idx = inArray(foundDevices, 'deviceId', device.deviceId)
                const data = {}
                if (idx === -1) {
                    data[`devices[${foundDevices.length}]`] = device
                } else {
                    data[`devices[${idx}]`] = device
                }
                
                this.setData(data)
            })
        })
    },

    gotoDevicePage(e){
        const ds = e.currentTarget.dataset
        const deviceId = ds.deviceId
        const name = ds.name
        const pageUrl = `../ble/bleComm?deviceId=${deviceId}&name=${name}`
        const tabUrl = 'ble/bleComm'
        console.log('goto page:',pageUrl)
        
        wx.navigateTo({
            url: pageUrl,
        })
        this.stopBluetoothDevicesDiscovery;
    },
    createBLEConnection(e) {
        console.log('createBLEConnection...')
        // debugger
        wx.navigateTo
        const ds = e.currentTarget.dataset
        const deviceId = ds.deviceId
        const name = ds.name
        wx.createBLEConnection({
            deviceId,
            success: (res) => {
                console.log('建立与设备的蓝牙连接成功。。。')
                this.setData({
                    connected: true,
                    name,
                    deviceId,
                })
                this.getBLEDeviceServices(deviceId)
            },
            fail: (err) => {
                console.log('建立与设备的蓝牙连接 失败:', err)
            }
        })
        this.stopBluetoothDevicesDiscovery()
    },
    closeBLEConnection() {
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false,
            chs: [],
            canWrite: false,
        })
    },
    getBLEDeviceServices(deviceId) {
        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                for (let i = 0; i < res.services.length; i++) {
                    console.log('遍历services: ', res.services[i]);
                    if (res.services[i].isPrimary) {
                        this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
                        return
                    }
                }
            },
            fail: (err) => { console.log('getBLEDeviceServices 失败...'); }
        })
    },
    getBLEDeviceCharacteristics(deviceId, serviceId) {
        wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res) => {
                console.log('getBLEDeviceCharacteristics success', res.characteristics)
                for (let i = 0; i < res.characteristics.length; i++) {
                    let item = res.characteristics[i]
                    if (item.properties.read) {
                        wx.readBLECharacteristicValue({
                            deviceId,
                            serviceId,
                            characteristicId: item.uuid,
                        })
                    }
                    if (item.properties.write) {
                        this.setData({
                            canWrite: true
                        })
                        this._deviceId = deviceId
                        this._serviceId = serviceId
                        this._characteristicId = item.uuid
                        this.writeBLECharacteristicValue()
                    }
                    if (item.properties.notify || item.properties.indicate) {
                        wx.notifyBLECharacteristicValueChange({
                            deviceId,
                            serviceId,
                            characteristicId: item.uuid,
                            state: true,
                        })
                    }
                }
            },
            fail(res) {
                console.error('getBLEDeviceCharacteristics', res)
            }
        })
        // 操作之前先监听，保证第一时间获取数据
        wx.onBLECharacteristicValueChange((characteristic) => {
            const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
            const data = {}
            if (idx === -1) {
                data[`chs[${this.data.chs.length}]`] = {
                    uuid: characteristic.characteristicId,
                    value: ab2hex(characteristic.value)
                }
            } else {
                data[`chs[${idx}]`] = {
                    uuid: characteristic.characteristicId,
                    value: ab2hex(characteristic.value)
                }
            }
            // data[`chs[${this.data.chs.length}]`] = {
            //   uuid: characteristic.characteristicId,
            //   value: ab2hex(characteristic.value)
            // }
            this.setData(data)
        })
    },
    writeBLECharacteristicValue() {
        // 向蓝牙设备发送一个0x00的16进制数据
        let buffer = new ArrayBuffer(1)
        let dataView = new DataView(buffer)
        dataView.setUint8(0, Math.random() * 255 | 0)
        wx.writeBLECharacteristicValue({
            deviceId: this._deviceId,
            serviceId: this._deviceId,
            characteristicId: this._characteristicId,
            value: buffer,
        })
    },
    closeBluetoothAdapter() {
        console.log('结束流程...')
        wx.closeBluetoothAdapter()
        this._discoveryStarted = false
        this.discoveryStarted = false
    },

    restartBluetoothAdapter() {
        this.data.devices = [];
        this.setData(this.data);
        wx.closeBluetoothAdapter({
            success: (res) => {
                this.openBluetoothAdapter();
            },
            fail: (res) => {
                console.log('restartBluetoothAdapter fail: ', res)
            },
        })
        this._discoveryStarted = false
    },
})
