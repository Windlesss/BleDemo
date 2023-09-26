// ble/bleComm.js
const hex = "7E7E7E03080178563412E0010000140000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000020102C80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003CBAECEBB000000000000000005C1F7C1BF000000000000000006CBB2CAB1C1F7C1BF000000000300000000000000000000000000000000000000000000000000000000000000000000000000000036305343594A303532313331373830300000000000000503434D4E45540000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003C007777772E736373717A782E6F7267000000000000000000000000000000000000000029230000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003070000000000000000016400000000010000010000000500D0020000003F0000000000000000010000803F0000000000000000000000000000000000000000000000000000020C00010000020302010000000500D0020AD7233C0000C8430000004003B6F39D3F00000C025B4000008FC2CC430000000000000000000000000000040E00000000000000000000000500D002000000000000000000000000090000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000C35"

function inArray(arr, key, val) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === val) {
            return i;
        }
    }
    return -1;
}

function hexStringToArrayBuffer(hexString) {
    var byteArray = new Uint8Array(hexString.length / 2);

    for (var i = 0; i < hexString.length; i += 2) {
        byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }

    return byteArray.buffer;
}

function sleep(delay) {
    var start = (new Date()).getTime();
    while ((new Date()).getTime() - start < delay) {
        continue;
    }
}
// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
    if (!buffer || buffer.length <= 0) {
        return ''
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

    /**
     * 页面的初始数据
     */
    data: {
        // disconnecByWill:false, // 主动断开              
        deviceId: '',
        deviceName: '',
        readServiceId: '',
        writeServiceId: '',
        logInfo: [],
        connected: false,
        writeChs: null,
        readChs: null,
        pageSize: 120, // 写入分包，暂时按20bytes
        listening: false,
        connectStateListening: false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        console.log('param name:', options.name)
        this.setData({
            deviceId: options.deviceId,
            deviceName: options.name,
        });
    },

    connectDevice() {
        this.createBLEConnection();
    },
    closeConnection() {
        this.output('closeConnection...')
        this.removeRecvListener();

        this.closeBLEConnection();
        this.data.readServiceId = '';
        this.data.writeServiceId = '';
        this.data.readChs = null;
        this.data.writeChs = null;
        this.data.listening = false;

    },

    createBLEConnection(e) {
        console.log('createBLEConnection...')
        // debugger
        let that = this;
        const deviceId = this.data.deviceId
        const name = this.data.deviceName
        console.log(`createBLEConnection name:${name}`)
        wx.createBLEConnection({
            deviceId,
            success: (res) => {
                console.log('建立与设备的蓝牙连接成功。。。deviceId:', deviceId)
                this.output(`连接成功 ${deviceId}`)
                console.log('查询services')
                this.getBLEDeviceServices(deviceId)
            },
            fail: (err) => {
                console.log('建立与设备的蓝牙连接 失败:', err)
                this.output(`建立与设备的蓝牙连接 失败:${err}`)
            }
        })
        this.stopBluetoothDevicesDiscovery()
    },
    closeBLEConnection() {
        console.log('closeBLEConnection...')
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false,
            readChs: null,
            writeChs: null,
            canWrite: false,
        })
    },
    getBLEDeviceServices(deviceId) {
        console.log('getBLEDeviceServices deviceId:', deviceId)
        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                console.log('getBLEDeviceServices res.services.length:', res.services.length)
                for (let i = 0; i < res.services.length; i++) {
                    console.log(`设备services[${i + 1}] isPrimary:${res.services[i].isPrimary}:${res.services[i].uuid}, isPrimary:${res.services[i].isPrimary}`);
                }
                for (let i = 0; i < res.services.length; i++) {
                    if (res.services[i].isPrimary) {
                        this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
                        // return
                    }
                }
            },
            fail: (err) => { console.log('getBLEDeviceServices 失败...', err); }
        })
    },
    getBLEDeviceCharacteristics(deviceId, serviceId) {
        let that = this;
        wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res) => {
                console.log('getBLEDeviceCharacteristics servicesId:', serviceId)
                for (let i = 0; i < res.characteristics.length; i++) {
                    let item = res.characteristics[i]
                    // console.log(`遍历chs[${item.uuid}] read:${item.properties.read},write:${item.properties.write},notify:${item.properties.notify},indicate:${item.properties.indicate}`);
                    if (item.properties.read && item.properties.notify) {
                        that.data.readServiceId = serviceId;
                        that.data.readChs = item.uuid;
                        this._deviceId = deviceId;
                        this._serviceId = serviceId;
                        this._characteristicId = item.uuid
                        console.log('可读chs ', that.data.readChs)
                        console.log(`可读chs[${item.uuid}] read:${item.properties.read},write:${item.properties.write},notify:${item.properties.notify},indicate:${item.properties.indicate}`);
                    }
                    if (item.properties.read && item.properties.write) {
                        that.data.writeChs = item.uuid;
                        that.data.writeServiceId = serviceId;
                        console.log('可写chs ', that.data.writeChs)
                    }
                    if (that.data.readChs && that.data.writeChs && !that.data.listening) {
                        that.data.listening = true;
                        console.log(`chs全部找到，read:${that.data.readChs},write:${that.data.writeChs}`);
                        that.setRecvListener();
                        break;
                    }
                }
            },
            fail(res) {
                console.error('getBLEDeviceCharacteristics', res)
            }
        })
    },
    // 0x7E, 0x7E, 0x7E, 0x03, 0x00, 0x20, 0xCB, 0xFF
    sendHandShake() {
        console.log('sendHandShake。。。')
        let arr = [0x7E, 0x7E, 0x7E, 0x03, 0x00, 0x20, 0xCB, 0xFF];
        let uint8Array = Uint8Array.from(arr);
        let buffer = uint8Array.buffer;

        this.writeDataByPage(buffer);
    },

    //7E 7E 7E 03 00 02 4B E6
    readConfig() {
        console.log('readConfig')
        let arr = [0x7E, 0x7E, 0x7E, 0x03, 0x00, 0x02, 0x4B, 0xE6];
        let uint8Array = Uint8Array.from(arr);
        let buffer = uint8Array.buffer;

        this.writeBLEDataCommonDirect(buffer);
    },

    writeConfig() {
        console.log('writeConfig')
        let data = hexStringToArrayBuffer(hex);
        console.log('写入数据 data len:', data.byteLength);
        console.log('写入数据 data:', ab2hex(data));
        // this.writeBLECharacteristicValue(data)
        this.writeDataByPage(data)
    },

    handleRecvData(value) {
        console.log('recv Data:', ab2hex(value));
        this.output(`recv ${ab2hex(value)}`)
    },

    writeDataByPage(buffer) {
        let pos = 0;
        let bytes = buffer.byteLength;
        var that = this;
        let arrayBuffer = buffer;
        console.log("bytes", bytes)
        console.log("arrayBuffer", buffer)
        console.log("arrayBuffer", arrayBuffer)
        while (bytes > 0) {
            let tmpBuffer;
            if (bytes > this.data.pageSize) {
                tmpBuffer = arrayBuffer.slice(pos, pos + this.data.pageSize);
                pos += this.data.pageSize;
                bytes -= this.data.pageSize;
                that.writeBLEDataCommon(tmpBuffer,
                    function (res) {
                        that.output(`常规包发送成功 ${tmpBuffer}`)
                    },
                    function (res) {
                        if (res.errCode == '10006') {
                            that.clearConnectData(); //当前连接已断开，清空连接数据
                            that.output('当前连接已断开');
                        }
                        that.output(`发送失败 ${res}`)
                    })
                sleep(0.02)
            } else {
                tmpBuffer = arrayBuffer.slice(pos, pos + bytes);
                console.log('无需分包或者最后一包:', tmpBuffer);
                pos += bytes;
                bytes -= bytes;
                that.writeBLEDataCommon(tmpBuffer,
                    function (res) {
                        that.output(`最后包发送成功 ${tmpBuffer}`)
                    },
                    function (res) {
                        if (res.errCode == '10006') {
                            that.closeConnection(); //清空连接数据
                            that.output('当前连接已断开');
                        }
                        that.output(`发送失败 ${res}`)
                    })
            }
        }
    },

    writeBLEDataCommonDirect(buffer) {
        let that = this
        wx.writeBLECharacteristicValue({
            deviceId: that.data.deviceId,
            serviceId: that.data.writeServiceId,
            characteristicId: that.data.writeChs,
            value: buffer,
            success: (res) => {
                console.log('发送数据成功:', res)
                this.output('发送数据成功')
                // this.readBleData();
            },
            fail: (err) => {
                console.log('发送数据失败:', err)
                this.output('发送数据失败')
            }
        });
    },

    writeBLEDataCommon(buffer, sucFunc, failFunc) {
        let that = this
        wx.writeBLECharacteristicValue({
            deviceId: that.data.deviceId,
            serviceId: that.data.writeServiceId,
            characteristicId: that.data.writeChs,
            value: buffer,
            success: sucFunc,
            fail: failFunc
            // success: (res) => {
            //     console.log('发送数据成功:', res)
            //     this.output('发送数据成功')
            //     // this.readBleData();
            // },
            // fail: (err) => {
            //     console.log('发送数据失败:', err)
            //     this.output('发送数据失败')
            // }
        });
    },

    setRecvListener() {
        let that = this
        wx.notifyBLECharacteristicValueChange({
            deviceId: that.data.deviceId,
            serviceId: that.data.readServiceId,
            characteristicId: that.data.readChs,
            // deviceId: this._deviceId,
            // serviceId: this._serviceId,
            // characteristicId:this._characteristicId,
            state: true,
            success(res) {
                console.log('notifyBLECharacteristicValueChange success', res);
                that.output('监听返回数据成功')
                wx.onBLECharacteristicValueChange((characteristic) => {
                    //处理蓝牙返回的数据
                    that.handleRecvData(characteristic.value);
                })
            },
            fail(err) {
                console.log('监听读取失败：', err)
                that.output(`监听读取失败： ${err}`)
            }
        })

        // 监听蓝牙设备连接状态变化
        // 连接状态的监听无法取消息，用标志位控制避免重复监听
        if (!this.data.connectStateListening) {
            this.data.connectStateListening = true;
            wx.onBLEConnectionStateChange(function (res) {
                var deviceId = res.deviceId;
                var connected = res.connected;
                // console.log('蓝牙设备连接状态变化：', deviceId, connected);
                if (!connected) {
                    // 蓝牙设备已断开连接，进行相应处理
                    that.output('蓝牙设备已断开连接');
                    that.data.listening = false;
                }
            });
        }
    },
    removeRecvListener() {
        let that = this
        this.output('removeRecvListener...')
        wx.offBLECharacteristicValueChange((res) => {
            console.log('取消蓝牙数据接收');
            that.output('取消监听蓝牙接收数据事件');
        })
        wx.offBLEConnectionStateChange((result) => {
            that.output(`取消监听蓝牙连接事件 ${result}`);
        })
    },

    stopBluetoothDevicesDiscovery() {
        wx.stopBluetoothDevicesDiscovery()
    },

    output(info) {
        var formattedTime = new Date().toISOString();
        info = `${formattedTime}: ${info}`;
        this.data.logInfo.push(info)
        this.setData(this.data)
    },
    clearOutput() {
        this.data.logInfo = []
        this.setData(this.data)
    },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {
        console.log(`onReady connectListening:${this.data.connectStateListening}`)
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }

})