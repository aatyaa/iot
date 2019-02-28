import 'package:flutter/material.dart';
import 'api_wright.dart';

class Home extends StatefulWidget {
  HomeState createState() => HomeState();
}

class HomeState extends State<Home> {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          image: DecorationImage(
              image: AssetImage('assets/pic/sign_back.png'),
              fit: BoxFit.cover)),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Column(
          children: <Widget>[
            SizedBox(
              height: 60,
            ),
            Center(
                child: Text(
              "Welcome to \nIOP",
              style: TextStyle(color: Colors.white, fontSize: 40),
              textAlign: TextAlign.center,
            )),
            SizedBox(
              height: 30,
              child: Center(
                child: Container(
                  height: 3,
                  width: 100,
                  color: Colors.blue,
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.only(left: 15, right: 15, top: 15),
              child: email(),
            ),
            Padding(
              padding: EdgeInsets.only(left: 15, right: 15, top: 15),
              child: pass(),
            ),
            Padding(
              padding: EdgeInsets.only(right: 10, left: 20),
              child: Text(
                "forget your password",
                style: TextStyle(color: Colors.blue, fontSize: 16),
              ),
            ),
            SizedBox(
              height: 10,
            ),
            butnSign(),
            SizedBox(
              height: 10,
            ),
            dontHaveAcount(),
            SizedBox(
              height: 10,
            ),
            Text(
              "OR",
              style: TextStyle(color: Colors.blue, fontSize: 20),
              textAlign: TextAlign.center,
            ),
            SizedBox(
              height: 10,
            ),
            methodSign(),
          ],
        ),
      ),
    );
  }

  Widget email() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.emailAddress,
      decoration: InputDecoration(
         fillColor: Colors.white,
        filled: true,
          hintText: 'you@examble.com',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget pass() {
    return TextFormField(
      cursorColor: Colors.white,
      keyboardType: TextInputType.text,
      obscureText: true,
      decoration: InputDecoration(
        fillColor: Colors.white,
        filled: true,
          hintText: 'Enter password',
          border:
              OutlineInputBorder(borderRadius: BorderRadius.circular(10.0))),
    );
  }

  Widget butnSign() {
    return FlatButton(
      color: Colors.blue,
      child: Container(
        width: MediaQuery.of(context).size.width*.8,
        height: 50,
        color: Colors.blue,
        child: Center(
          child: Text(
            "Sign in",
            style: TextStyle(color: Colors.white, fontSize: 30),
            textAlign: TextAlign.center,
          ),
        ),
      ),
      onPressed: () {
        Navigator.push(context,
            MaterialPageRoute(builder: (BuildContext context) => ApiWrights()));
      },
    );
  }

  Widget dontHaveAcount() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Text("Don't have an acount?",
            style: TextStyle(color: Colors.white, fontSize: 18)),
        Text(
          " Rgister",
          style: TextStyle(color: Colors.blue, fontSize: 18),
        )
      ],
    );
  }

  Widget methodSign() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Image.asset("assets/pic/linkedin.png"),
        SizedBox(
          width: 40,
        ),
        Image.asset("assets/pic/google.png"),
        SizedBox(
          width: 40,
        ),
        Image.asset("assets/pic/face.png"),
      ],
    );
  }
}
