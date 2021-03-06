#!/usr/bin/env python2

from AWSScout2.finding import *

class CloudTrailFinding(Finding):

    def __init__(self, description, entity, callback, callback_args, level, questions):
        self.keyword_prefix = 'cloudtrail'
        Finding.__init__(self, description, entity, callback, callback_args, level, questions)

    def checkLoggingIsEnabled(self, key, obj):
        if obj['trails']:
            for trail in obj['trails']:
                if not obj['trails'][trail]['IsLogging']:
                    self.addItem(key)
        else:
            self.addItem(key)
