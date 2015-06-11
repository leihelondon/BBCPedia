define(function () {
    'use strict';

    var intGEL = {
        /**
         * Creates a new StateMachineFactory, which is used to create state machines
         * @name StateMachineFactory
         * @class
         */
        StateMachineFactory: function () {
            var transitions = [];

            function newTransition(stateMachine, name) {
                return function () {
                    if(transitions[name] && transitions[name][stateMachine.currentState]) {
                        var transition = transitions[name][stateMachine.currentState];
                        stateMachine.currentState = transition.endState;
                        transition.action.apply(null, arguments);
                    }
                };
            }

            function addPendingTransitions(names, initialStates, endState, callback) {
                for (var t = 0, numberOfNames = names.length; t < numberOfNames; ++t) {
                    var name = names[t];
                    if (!transitions[name]) {
                        transitions[name] = [];
                    }
                    for (var i = 0, numberOfStates = initialStates.length; i < numberOfStates; ++i) {
                        transitions[name][initialStates[i]] = {
                            endState: endState,
                            action: callback
                        };
                    }
                }
            }

            return {
                /**
                 * Sets a transition
                 *
                 * @method
                 * @name StateMachineFactory#setTransition
                 * @param {string} name - The name of the transition that may be called in order to take the state machine (once built) from the given initial state to the given end state
                 * @param {string} initialState - The initial state from which the transition will take the state machine to the given end state
                 * @param {string} endState - The end state to which the transition will always take the state machine from the given initial state
                 * @param {callback} callback - The callback function that will be called when the state machine performs the transition from the given initial state; this can have any number of parameters of any type - the parameters will be passed to the corresponding function that is generated for the given transition
                 */
                setTransition: function(name, initialState, endState, callback) {
                    addPendingTransitions([name], [initialState], endState, callback);
                },

                /**
                 * Sets multiple transitions
                 *
                 * @method
                 * @name StateMachineFactory#setTransitions
                 * @param {string[]} names - The names of the transitions that may be called in order to take the state machine (once built) from any of the given initial states to the given end state
                 * @param {string[]} initialStates - The initial states from which the transition will take the state machine to the given end state
                 * @param {string} endState - The end state to which the transition will always take the state machine from the given initial state
                 * @param {callback} callback - The callback function that will be called when the state machine performs the transition from any of the given initial states; this can have any number of parameters of any type - the parameters will be passed to the corresponding function that is generated for the given transition
                 */
                setTransitions: addPendingTransitions,

                /**
                 * Builds the state machine
                 *
                 * @method
                 * @name StateMachineFactory#build
                 * @param {string} initialState - The state in which the state machine will be when initialised
                 * @returns {Object} A new state machine with the transitions defined via setTransition and setTransitions
                 */
                build: function(initialState) {
                    var stateMachine = {
                        currentState: initialState
                    };
                    for(var name in transitions) {
                        stateMachine[name] = newTransition(stateMachine, name);
                    }
                    return stateMachine;
                }
            };
        },

        /**
         * Creates a new Search, which is used to control the search behaviour
         * @name Search
         * @param {Object} searchBox - A jQuery DOM element matching the `intGEL-searchBox` element on the {@link http://bbc.github.io/internalGEL/demos.html|Demo} page
         * @param {Search~Parameters} [parameters] - Parameters with which the search may be initialised
         * @class
         */
        Search: function($searchBox, parameters) {
            var searchCallback = function () {},
                clearCallback = function () {},
                $searchForm = $searchBox.find('form'),
                $searchIcon = $searchBox.find('button[type="submit"]'),
                $clearIcon = $searchBox.find('button[type="reset"]'),
                $input = $searchBox.find('.intGEL-search'),
                $searchContextContainer =  $searchBox.find('.intGEL-search-context-container'),
                $searchContextInvisibleText = $searchContextContainer.find('.intGEL-invisible'),
                $searchContext = $searchContextContainer.find('.intGEL-search-context'),
                shouldSubmitQuery = true,
                context = '';

            function setContext(text) {
                context = text;
                $input.attr('placeholder', context);
            }

            if(typeof parameters !== 'undefined') {
                if (typeof parameters.context !== 'undefined') {
                    setContext(parameters.context);
                }
                if (typeof parameters.query !== 'undefined') {
                    $input.val(parameters.query);
                }
            }

            function hide($element) {
                $element.addClass('hidden');
            }
            function show($element) {
                $element.removeClass('hidden');
            }

            function showContext() {
                $input.addClass('intGEL-search-with-context');
                show($searchContextContainer);
            }

            function hideContext() {
                $input.removeClass('intGEL-search-with-context');
                hide($searchContextContainer);
            }

            function showSearch(query) {
                if (context.length > 0) {
                    $searchContext.text('in '+ context);
                } else {
                    $searchContext.text('');
                }
                showContext();
                hide($searchIcon);
                show($clearIcon);
            }

            function showSearchIcon() {
                hide($clearIcon);
                show($searchIcon);
            }

            function setInput(text) {
                $input.val(text);
                $searchContextInvisibleText.text(text);
            }

            function clearQuery() {
                setInput('');
                hideContext();
                stateMachine.clear();
            }

            function clearQueryWithCallback() {
                clearCallback();
                clearQuery();
            }

            function updateQuery(query) {
                searchCallback(query);
                if(typeof query === 'undefined' || query.length === 0) {
                    clearQuery();
                } else {
                    setInput(query);
                    stateMachine.search(query);
                }
                $input.blur();
            }

            function noOp() {}

            var stateMachineFactory = new intGEL.StateMachineFactory();

            stateMachineFactory.setTransition('focus', 'empty', 'preSearchWithoutContent', function() {
                $searchBox.addClass('focused');
            });
            stateMachineFactory.setTransition('unfocus', 'preSearchWithoutContent', 'empty', function() {
                $searchBox.removeClass('focused');
            });

            stateMachineFactory.setTransition('focus', 'postSearchWithContext', 'postSearchWithoutContext', hideContext);
            stateMachineFactory.setTransition('unfocus', 'postSearchWithoutContext', 'postSearchWithContext', showContext);

            stateMachineFactory.setTransition('search', 'empty', 'postSearchWithContext', function (query) {
                $searchBox.addClass('focused');
                showSearch(query);
            });
            stateMachineFactory.setTransition('search', 'preSearchWithContent', 'postSearchWithContext', function (query) {
                showSearch(query);
            });

            stateMachineFactory.setTransitions(['clear'], ['postSearchWithoutContext', 'postSearchWithContext'], 'preSearchWithoutContent', showSearchIcon);
            stateMachineFactory.setTransition('change', 'postSearchWithoutContext', 'preSearchWithContent', showSearchIcon);

            stateMachineFactory.setTransition('clear', 'preSearchWithContent', 'preSearchWithoutContent', noOp);
            stateMachineFactory.setTransition('change', 'preSearchWithoutContent', 'preSearchWithContent', noOp);

            var stateMachine = stateMachineFactory.build('empty');

            $input.focusin(stateMachine.focus);
            $input.focusout(function (e) {
                if($input.val().length > 0 || e.relatedTarget === $searchIcon[0]) {
                    shouldSubmitQuery = true;
                } else {
                    shouldSubmitQuery = false;
                }
                stateMachine.unfocus();
            });
            $searchForm.submit(function (e) {
                e.preventDefault();
                updateQuery($input.val());
            });
            $searchIcon.click(function (e) {
                e.preventDefault();
                if(document.activeElement === $input[0]) {
                    shouldSubmitQuery = true;
                }
                if(shouldSubmitQuery) {
                    updateQuery($input.val());
                } else {
                    $input.focus();
                }
            });
            $clearIcon.click(function (e) {
                e.preventDefault();
                $input.focus();
                clearQueryWithCallback();
            });
            $input.keyup(function (e) {
                $searchContextInvisibleText.text($input.val());
                if ($input.val().length === 0) {
                    stateMachine.clear();
                } else {
                    stateMachine.change();
                }
            });

            updateQuery($input.val());

            return {
                /**
                 * Sets the callback executed whenever a search occurs
                 *
                 * @method
                 * @name Search#onSearch
                 * @param {Search~SearchCallback} callback - The callback that is called whenever a search occurs
                 */
                onSearch: function(callback) {
                    searchCallback = callback;
                },
                /**
                 * Sets the callback executed whenever the search query is cleared
                 *
                 * @method
                 * @name Search#onClear
                 * @param {callback} callback - The callback that is called whenever the search query is cleared; this callback should not have any parameters
                 */
                onClear: function(callback) {
                    clearCallback = callback;
                },
                /**
                 * Sets the context of the project
                 *
                 * @method
                 * @name Search#setContext
                 * @param {string} context - The context that is displayed next to the search term when a search is submitted
                 */
                setContext: function(context) {
                    setContext(context);
                },
                /**
                 * Replaces the current search query with the one given
                 *
                 * @method
                 * @name Search#update
                 * @param {string} query - The query that will replace the current one
                 */
                update: function(query) {
                    updateQuery(query);
                },
                /**
                 * Clears the current search query
                 *
                 * @method
                 * @name Search#clear
                 */
                clear: function() {
                    clearQueryWithCallback();
                }

                /**
                 * A callback passed to onSearch
                 * @callback Search~SearchCallback
                 * @param {string} query - The search term that has been submitted
                 */

                 /**
                 * Optional parameters with which the Search may be initialised
                 * @typedef {Object} Search~Parameters
                 * @property {string} [query] - An initial search query with which the search bar may be initialised
                 * @property {string} [context] - The context that is displayed next to the search term when a search is submitted
                 */
            };
        }
    };

    return intGEL;
});
