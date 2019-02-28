import 'package:flutter/material.dart';

class Datacrop extends StatefulWidget {
  DatacropState createState() => DatacropState();
}

class DatacropState extends State<Datacrop> {
  @override
  Widget build(BuildContext context) {
    return Container(
        decoration: BoxDecoration(
            image: DecorationImage(
                image: AssetImage('assets/pic/sign_back.png'),
                fit: BoxFit.cover)),
        child: Scaffold(
            backgroundColor: Colors.transparent,
            body: ListView(
              children: <Widget>[
                SizedBox(
                  height: 70,
                ),
                appBar(),
              ],
            )));
  }

  Widget appBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Text(
          "Home",
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        SizedBox(
          width: 5,
        ),
        Container(
          color: Colors.white54,
          height: 30,
          width: 1,
        ),
        SizedBox(
          width: 50,
        ),
        Text(
          "Monitorin",
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        SizedBox(
          width: 50,
        ),
        Text(
          "anal",
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
      ],
    );
  }
}
