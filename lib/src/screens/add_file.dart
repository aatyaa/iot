import 'package:flutter/material.dart';

class Addfile extends StatefulWidget {
  AddfileState createState() => AddfileState();
}

class AddfileState extends State<Addfile> {
  @override
  Widget build(BuildContext context) {
    return Container(
        decoration: BoxDecoration(
            image: DecorationImage(
                image: AssetImage('assets/pic/api_back.png'),
                fit: BoxFit.cover)),
        child: Scaffold(
            backgroundColor: Colors.transparent,
            body: ListView(
              padding: EdgeInsets.only(left: 10, right: 10),
              children: <Widget>[
                SizedBox(
                  height: 70,
                ),
                appBar(),
                SizedBox(
                  height: 20,
                ),
                plantType(),
                SizedBox(
                  height: 10,
                ),
                agerclutcher(),
                SizedBox(
                  height: 10,
                ),
                torpa(),
                SizedBox(
                  height: 10,
                ),
                agerclutcher(),
                SizedBox(
                  height: 10,
                ),
                wayOfagri(),
                SizedBox(
                  height: 10,
                ),
                wayofWater(),
                SizedBox(
                  height: 10,
                ),
                buTon(),
                SizedBox(
                  width: 20,
                ),
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
        SizedBox(
          width: 10,
        ),
      ],
    );
  }

  Widget plantType() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          hintText: 'نوع النبات',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget agerclutcher() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          hintText: 'موسم الزراعة',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget torpa() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          hintText: 'نوع التربة',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget wayOfagri() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          hintText: 'طريقة الزراعة',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget wayofWater() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          hintText: 'طريقة الرى',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget buTon() {
    return Center(
      child: InkWell(
        onTap: () {
          Navigator.push(context,
              MaterialPageRoute(builder: (BuildContext context) => Addfile()));
        },
        child: Container(
            width: MediaQuery.of(context).size.width * .9,
            height: 50,
            color: Colors.blue,
            child: Center(
              child: Text(
                "تاكيد",
                style: TextStyle(color: Colors.white, fontSize: 40),
              ),
            )),
      ),
    );
  }
}
