import cgitb
def noReset():
    return "Content-Type: text/html\n\n<html>\n"
cgitb.reset = noReset
oldhtml = cgitb.html
def newHTML(myTuple, context=5):
    x = oldhtml(myTuple, context)
    return x + "\n</body></html>\n"
cgitb.html = newHTML

import sys
import os
import cgi

import atlasBackend
abe = atlasBackend.Main
form = cgi.FieldStorage
