import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:iop/src/screens/add_file.dart';
import 'package:iop/src/screens/data.dart';
import 'package:http/http.dart' as http;

class ApiWrights extends StatefulWidget {
  ApiWrightsState createState() => ApiWrightsState();
}

class ApiWrightsState extends State<ApiWrights> {
  String fieldname1 = " ";
  String fieldname2 = "";

  String field1Value = "";
  String field2Value = "";

  @override
  void initState() {
    super.initState();
    fetchData(context);
  }

  Future<String> fetchData(context) async {
    String url =
        "https://api.thingspeak.com/channels/709902/feeds.json?api_key=QF8LTNYSN2ED24IN&results=2&fbclid=IwAR3yYbq3XIa3woPWbDEUF755aOdQwWl1EgTgzyK_6yjTrh5EgOmvcK-clBM";

    http.Response respond = await http
        .get(Uri.encodeFull(url), headers: {"Accept": "application/json"});
    if (respond.statusCode == 200) {
      var fielsd = json.decode(respond.body);

      print(field1Value + " " + field2Value);

      setState(() {
        fieldname1 = fielsd['channel']['field1'];
        fieldname2 = fielsd['channel']['field2'];

        field1Value = fielsd['feeds'][0]['field1'];
        field2Value = fielsd['feeds'][0]['field2'];
      });
    }
  }

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
            children: <Widget>[
              SizedBox(
                height: 70,
              ),
              appBar(),
              SizedBox(
                height: 40,
              ),
              addCrop(),
              SizedBox(
                height: 10,
              ),
              content(),
              SizedBox(
                height: 5,
              ),
              image(),
              SizedBox(
                width: 10,
              ),
            ],
          ),
        ));
  }

  Widget image() {
    return Image(
      width: MediaQuery.of(context).size.width * .5,
      image: AssetImage("assets/pic/photo.png"),
      alignment: Alignment.center,
      fit: BoxFit.cover,
    );
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

  Widget addCrop() {
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
          child: Row(
            children: <Widget>[
              Icon(
                Icons.add,
                color: Colors.white,
              ),
              SizedBox(
                width: 20,
              ),
              Container(
                height: 50,
                width: 1,
                color: Colors.white,
              ),
              SizedBox(
                width: 40,
              ),
              Center(
                child: Text(
                  "Add crop production",
                  style: TextStyle(color: Colors.white),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget content() {
    return Center(
      child: InkWell(
        child: Container(
          color: Colors.white,
          width: MediaQuery.of(context).size.width * .9,
          height: 255,
          child: Column(
            children: <Widget>[
              Text(
                "tomatoA1",
                textAlign: TextAlign.start,
                style: TextStyle(),
              ),
              SizedBox(
                height: 20,
              ),
              Row(
                children: <Widget>[
                  SizedBox(
                    width: 10,
                  ),
                  Image(
                    image: AssetImage("assets/pic/frute.png"),
                  ),
                  SizedBox(
                    width: 10,
                  ),
                  InkWell(
                    child: Icon(
                      Icons.arrow_forward,
                      color: Colors.grey,
                      size: 30,
                    ),
                    onTap: () {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (BuildContext context) => Datacrop()));
                    },
                  )
                ],
              ),
              SizedBox(
                height: 10,
              ),
              Container(
                color: Colors.black,
                height: 1,
                width: MediaQuery.of(context).size.width * .7,
              ),
              SizedBox(
                height: 3,
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Column(
                    children: <Widget>[
                      Icon(Icons.av_timer),
                      Text(
                        field1Value,
                        style: TextStyle(color: Colors.blue),
                      ),
                      Text(
                        fieldname1,
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    ],
                  ),
                  SizedBox(
                    width: 20,
                  ),
                  Column(
                    children: <Widget>[
                      Icon(Icons.hot_tub),
                      Text(
                        field2Value,
                        style: TextStyle(color: Colors.blue),
                      ),
                      Text(
                        fieldname2,
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    ],
                  ),
                  SizedBox(
                    width: 20,
                  ),
                  Column(
                    children: <Widget>[
                      Icon(Icons.insert_chart),
                      Text(
                        "5 ms/cm",
                        style: TextStyle(color: Colors.blue),
                      ),
                      Text(
                        "EC",
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    ],
                  ),
                  SizedBox(
                    width: 20,
                  ),
                  Column(
                    children: <Widget>[
                      Icon(Icons.pin_drop),
                      Text(
                        "5 g/m",
                        style: TextStyle(color: Colors.blue),
                      ),
                      Text(
                        "soll",
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
