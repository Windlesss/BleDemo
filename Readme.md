# 微信小程序蓝牙连接Ble设备Demo

## 完成功能
 - 蓝牙的扫描、连接、遍历services、charactors
 - 读写数据，读写大数据(2048bytes)
 - 安卓和iOS的兼容性

## 发现的问题

- `wx.onBLEConnectionStateChange` 连接监听的问题
    监听连接后，`wx.offBLEConnectionStateChange`无效；即保持在当前页面的状态下，重复连接再断开，会导致重复监听，目前解决方式是加标志位限制重复监听
    实际上，取消读数据的指令`wx.offBLECharacteristicValueChange`也没有起效果，但是没有重复监听的问题
- 如果微信没有定位权限，即使小程序首次运行给予了蓝牙权限，仍然会搜索不到任何蓝牙数据
    安卓手机上有此问题，解决方法是在手机系统设置中手动给微信位置权限；iOS未测试，不确定是否存在此问题